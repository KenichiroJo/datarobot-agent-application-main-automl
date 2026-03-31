import logging
from functools import lru_cache
from typing import Any

import datarobot as dr
import pandas as pd
import requests as http_requests
from datarobot.models.deployment.deployment import Deployment
from datarobot_predict.deployment import (
    PredictionResult,
    _deployment_predict,
    _read_response_csv,
)

logger = logging.getLogger(__name__)


class DataRobotClient:
    """DataRobot SDK wrapper with caching for model insights and predictions."""

    def __init__(self, endpoint: str, token: str) -> None:
        self._endpoint = endpoint
        self._token = token
        dr.Client(endpoint=endpoint, token=token)

    def _api_get(self, path: str) -> Any:
        """Direct REST API call to DataRobot."""
        url = f"{self._endpoint}/{path.lstrip('/')}"
        resp = http_requests.get(url, headers={"Authorization": f"Bearer {self._token}"})
        resp.raise_for_status()
        return resp.json()

    def _get_deployment(self, deployment_id: str) -> Deployment:
        return dr.Deployment.get(deployment_id)

    def _get_model(self, project_id: str, model_id: str) -> dr.Model:
        return dr.Model.get(project=project_id, model_id=model_id)

    def get_deployment_info(self, deployment_id: str) -> dict[str, Any]:
        deployment = self._get_deployment(deployment_id)
        model_meta = deployment.model
        project_id = model_meta.get("project_id") or model_meta.get("project", {}).get("id")
        model_id = model_meta.get("id")
        target = model_meta.get("target_name") or model_meta.get("target", {}).get("name")
        target_type = model_meta.get("target_type", "Binary")

        result: dict[str, Any] = {
            "deploymentId": deployment_id,
            "projectId": project_id,
            "modelId": model_id,
            "target": target,
            "targetType": target_type,
            "positiveClass": None,
            "predictionThreshold": None,
            "modelType": "",
            "featureNames": [],
            "createdAt": "",
        }

        if project_id and model_id:
            try:
                model = self._get_model(project_id, model_id)
                result["modelType"] = getattr(model, "model_type", "")
                result["featureNames"] = getattr(model, "featurelist_name", "")
            except Exception:
                logger.warning("Could not fetch model details for %s/%s", project_id, model_id)

        try:
            project = dr.Project.get(project_id)
            result["positiveClass"] = getattr(project, "positive_class", None)
            result["predictionThreshold"] = getattr(project, "default_prediction_threshold", None)
            if hasattr(project, "created"):
                result["createdAt"] = str(project.created)
        except Exception:
            logger.warning("Could not fetch project details for %s", project_id)

        return result

    def get_feature_impact(self, project_id: str, model_id: str) -> dict[str, Any]:
        model = self._get_model(project_id, model_id)
        fi = model.get_or_request_feature_impact()
        features = [
            {
                "featureName": item["featureName"],
                "impactNormalized": item["impactNormalized"],
                "impactUnnormalized": item["impactUnnormalized"],
                "redundantWith": item.get("redundantWith"),
            }
            for item in fi
        ]
        return {"features": features, "count": len(features)}

    def get_roc_curve(
        self, project_id: str, model_id: str, source: str = "validation"
    ) -> dict[str, Any]:
        model = self._get_model(project_id, model_id)
        roc = model.get_roc_curve(source)
        roc_points = [
            {
                "threshold": pt["threshold"],
                "falsePositiveRate": pt["false_positive_rate"],
                "truePositiveRate": pt["true_positive_rate"],
            }
            for pt in roc.roc_points
        ]
        # Compute AUC via trapezoidal rule (roc.auc may not exist)
        auc_value = getattr(roc, "auc", None)
        if auc_value is None:
            sorted_pts = sorted(roc.roc_points, key=lambda p: p["false_positive_rate"])
            fprs = [p["false_positive_rate"] for p in sorted_pts]
            tprs = [p["true_positive_rate"] for p in sorted_pts]
            auc_value = sum(
                (fprs[i + 1] - fprs[i]) * (tprs[i + 1] + tprs[i]) / 2
                for i in range(len(fprs) - 1)
            )
        return {"auc": round(auc_value, 6), "source": source, "rocPoints": roc_points}

    def get_lift_chart(
        self, project_id: str, model_id: str, source: str = "validation"
    ) -> dict[str, Any]:
        model = self._get_model(project_id, model_id)
        lift = model.get_lift_chart(source)
        bins = [
            {
                "binWeight": b.get("bin_weight", b.get("binWeight", 0)),
                "actual": b["actual"],
                "predicted": b["predicted"],
            }
            for b in lift.bins
        ]
        return {"source": source, "bins": bins}

    def get_confusion_matrix(
        self,
        project_id: str,
        model_id: str,
        threshold: float = 0.5,
        source: str = "validation",
    ) -> dict[str, Any]:
        """Get confusion matrix by finding the closest threshold in the ROC data."""
        try:
            # Use REST API directly for reliable access to count fields
            data = self._api_get(
                f"projects/{project_id}/models/{model_id}/rocCurve/{source}/"
            )
            roc_points = data.get("rocPoints", [])
        except Exception:
            # Fallback to SDK
            model = self._get_model(project_id, model_id)
            roc = model.get_roc_curve(source)
            roc_points = roc.roc_points

        if not roc_points:
            return {
                "threshold": threshold,
                "source": source,
                "classes": ["0", "1"],
                "matrix": [[0, 0], [0, 0]],
                "metrics": {"accuracy": 0, "precision": 0, "recall": 0, "f1": 0},
            }

        # Find the closest threshold point
        closest = min(roc_points, key=lambda pt: abs(pt.get("threshold", 0) - threshold))

        # Extract counts - REST API uses camelCase keys
        tp = closest.get("truePositiveCount", closest.get("true_positive_count", 0)) or 0
        fp = closest.get("falsePositiveCount", closest.get("false_positive_count", 0)) or 0
        tn = closest.get("trueNegativeCount", closest.get("true_negative_count", 0)) or 0
        fn = closest.get("falseNegativeCount", closest.get("false_negative_count", 0)) or 0

        # If counts are still 0, compute from rates
        if tp + fp + tn + fn == 0:
            pos_total = (
                data.get("positiveClassPredictions", 0)
                if isinstance(data, dict)
                else 0
            ) or 0
            neg_total = (
                data.get("negativeClassPredictions", 0)
                if isinstance(data, dict)
                else 0
            ) or 0
            tpr = closest.get("truePositiveRate", closest.get("true_positive_rate", 0)) or 0
            fpr = closest.get("falsePositiveRate", closest.get("false_positive_rate", 0)) or 0
            if pos_total or neg_total:
                tp = round(tpr * pos_total)
                fn = pos_total - tp
                fp = round(fpr * neg_total)
                tn = neg_total - fp

        total = tp + fp + tn + fn
        accuracy = (tp + tn) / total if total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            "threshold": closest.get("threshold", threshold),
            "source": source,
            "classes": ["0", "1"],
            "matrix": [[tn, fp], [fn, tp]],
            "metrics": {
                "accuracy": round(accuracy, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
            },
        }

    def get_accuracy_metrics(self, project_id: str, model_id: str) -> dict[str, Any]:
        model = self._get_model(project_id, model_id)
        metrics_data = model.metrics
        optimization_metric = getattr(model, "optimization_metric", "LogLoss")

        metrics_list = []
        for name, sources in metrics_data.items():
            if isinstance(sources, dict) and "validation" in sources:
                val = sources["validation"]
                if val is not None:
                    metrics_list.append(
                        {"name": name, "value": val, "source": "validation"}
                    )

        return {"metrics": metrics_list, "optimizationMetric": optimization_metric}

    def get_feature_effects(
        self, project_id: str, model_id: str, feature_name: str
    ) -> dict[str, Any]:
        """Get feature effects using REST API with SDK fallback."""
        feature_effects_list = self._fetch_feature_effects(project_id, model_id)

        for item in feature_effects_list:
            fname = item.get("featureName", item.get("feature_name", ""))
            if fname == feature_name:
                pd_raw = item.get("partialDependence", item.get("partial_dependence", {}))
                if isinstance(pd_raw, dict):
                    raw_data = pd_raw.get("data", [])
                elif isinstance(pd_raw, list):
                    raw_data = pd_raw
                else:
                    raw_data = []
                pd_data = []
                for pt in raw_data:
                    label = pt.get("label", pt.get("value", ""))
                    dep = pt.get("partialDependence", pt.get("partial_dependence", pt.get("dependence", 0)))
                    pd_data.append({"label": str(label), "dependence": dep})
                return {
                    "featureName": feature_name,
                    "featureType": item.get("featureType", item.get("feature_type", "unknown")),
                    "partialDependence": pd_data,
                }

        return {
            "featureName": feature_name,
            "featureType": "unknown",
            "partialDependence": [],
        }

    def _fetch_feature_effects(self, project_id: str, model_id: str) -> list[dict]:
        """Try REST API first, then SDK, to fetch feature effects."""
        # Attempt 1: REST API
        for source in ("validation", "crossValidation", "holdout"):
            try:
                data = self._api_get(
                    f"projects/{project_id}/models/{model_id}/featureEffects/{source}/"
                )
                effects = data.get("featureEffects", [])
                if effects:
                    return effects
            except Exception:
                continue

        # Attempt 2: Request computation then fetch
        try:
            url = f"{self._endpoint}/projects/{project_id}/models/{model_id}/featureEffects/"
            http_requests.post(
                url, headers={"Authorization": f"Bearer {self._token}"},
                json={"rowCount": 10},
            )
            # Wait a moment and re-fetch
            import time
            time.sleep(3)
            for source in ("validation", "crossValidation", "holdout"):
                try:
                    data = self._api_get(
                        f"projects/{project_id}/models/{model_id}/featureEffects/{source}/"
                    )
                    effects = data.get("featureEffects", [])
                    if effects:
                        return effects
                except Exception:
                    continue
        except Exception as e:
            logger.warning("Feature effects REST fallback failed: %s", e)

        # Attempt 3: SDK
        try:
            model = self._get_model(project_id, model_id)
            for src in ("validation", "crossValidation", "holdout"):
                try:
                    fe = model.get_or_request_feature_effect(source=src)
                    if hasattr(fe, "feature_effects") and fe.feature_effects:
                        return fe.feature_effects
                except Exception:
                    continue
        except Exception as e:
            logger.warning("Feature effects SDK fallback failed: %s", e)

        return []

    def get_partial_dependence(
        self, project_id: str, model_id: str, feature_name: str
    ) -> dict[str, Any]:
        feature_effects_list = self._fetch_feature_effects(project_id, model_id)

        for item in feature_effects_list:
            fname = item.get("featureName", item.get("feature_name", ""))
            if fname == feature_name:
                pd_raw = item.get("partialDependence", item.get("partial_dependence", {}))
                if isinstance(pd_raw, dict):
                    raw_data = pd_raw.get("data", [])
                elif isinstance(pd_raw, list):
                    raw_data = pd_raw
                else:
                    raw_data = []
                data = []
                for pt in raw_data:
                    val = pt.get("label", pt.get("value", ""))
                    dep = pt.get("partialDependence", pt.get("partial_dependence", pt.get("meanPrediction", 0)))
                    data.append({"value": val, "meanPrediction": dep})
                return {
                    "featureName": feature_name,
                    "featureType": item.get("featureType", item.get("feature_type", "unknown")),
                    "data": data,
                }

        return {"featureName": feature_name, "featureType": "unknown", "data": []}

    def get_word_cloud(self, project_id: str, model_id: str) -> dict[str, Any]:
        model = self._get_model(project_id, model_id)
        try:
            wc = model.get_word_cloud()
            words = [
                {"text": w["ngram"], "weight": w["coefficient"], "class": w.get("class", "neutral")}
                for w in wc.ngrams
            ]
            return {"words": words}
        except Exception:
            logger.info("Word cloud not available for model %s", model_id)
            return {"words": []}

    def get_dataset_records(
        self, dataset_id: str, offset: int = 0, limit: int = 20
    ) -> dict[str, Any]:
        dataset = dr.Dataset.get(dataset_id)
        df = dataset.get_as_dataframe()
        total = len(df)
        columns = list(df.columns)
        sliced = df.iloc[offset : offset + limit]
        records = sliced.to_dict(orient="records")
        # Convert NaN values to None for JSON serialization
        for record in records:
            for key, val in record.items():
                if pd.isna(val):
                    record[key] = None
        return {
            "records": records,
            "total": total,
            "offset": offset,
            "limit": limit,
            "columns": columns,
        }

    def get_dataset_schema(self, dataset_id: str) -> dict[str, Any]:
        dataset = dr.Dataset.get(dataset_id)
        df = dataset.get_as_dataframe()
        columns = []
        for col in df.columns:
            col_info: dict[str, Any] = {"name": col, "type": str(df[col].dtype)}
            if df[col].dtype in ("float64", "int64", "float32", "int32"):
                col_info["min"] = float(df[col].min()) if not df[col].isna().all() else None
                col_info["max"] = float(df[col].max()) if not df[col].isna().all() else None
            col_info["uniqueCount"] = int(df[col].nunique())
            columns.append(col_info)
        return {"columns": columns, "rowCount": len(df)}

    def predict(
        self, deployment_id: str, data: dict[str, Any], max_explanations: int = 10
    ) -> dict[str, Any]:
        deployment = self._get_deployment(deployment_id)
        target_name = deployment.model.get("target_name", "target")

        df = pd.DataFrame([data])

        params: dict[str, Any] = {"maxExplanations": max_explanations}
        headers: dict[str, str] = {}

        response = _deployment_predict(
            deployment=deployment,
            endpoint="predictions",
            headers=headers,
            params=params,
            data=df,
            stream=False,
            timeout=600,
            prediction_endpoint=None,
        )
        prediction_result = PredictionResult(_read_response_csv(response), response.headers)
        pred_df = prediction_result.dataframe
        pred_row = pred_df.iloc[0].to_dict()

        # Extract prediction
        pred_col = f"{target_name}_PREDICTION"
        prediction = str(pred_row.get(pred_col, pred_row.get("prediction", "")))

        # Extract class probabilities
        class_probs: dict[str, float] = {}
        for col in pred_df.columns:
            if col.endswith("_PREDICTION") and col != pred_col:
                class_name = col.replace("_PREDICTION", "").replace(f"{target_name}_", "")
                class_probs[class_name] = float(pred_row[col])
        if not class_probs:
            # Try alternative column naming
            for col in pred_df.columns:
                if "_OUTPUT" in col:
                    class_name = col.replace("_OUTPUT", "").replace(f"{target_name}_", "")
                    class_probs[class_name] = float(pred_row[col])

        # Determine prediction probability
        prediction_probability = class_probs.get(prediction, 0.0)

        # Extract explanations
        explanations = []
        for i in range(1, max_explanations + 1):
            feat_col = f"EXPLANATION_{i}_FEATURE_NAME"
            if feat_col not in pred_row or pd.isna(pred_row.get(feat_col)):
                break
            explanations.append({
                "featureName": pred_row[feat_col],
                "featureValue": pred_row.get(f"EXPLANATION_{i}_ACTUAL_VALUE"),
                "strength": float(pred_row.get(f"EXPLANATION_{i}_STRENGTH", 0)),
                "qualitativeStrength": pred_row.get(f"EXPLANATION_{i}_QUALITATIVE_STRENGTH", ""),
                "label": pred_row.get(f"EXPLANATION_{i}_LABEL", prediction),
            })

        return {
            "prediction": prediction,
            "predictionProbability": prediction_probability,
            "classProbabilities": class_probs,
            "explanations": explanations,
            "ngramExplanations": [],
        }
