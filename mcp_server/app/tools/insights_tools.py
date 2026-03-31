import logging
from typing import Annotated

import datarobot as dr
from datarobot_genai.drmcp import dr_mcp_tool
from fastmcp.exceptions import ToolError
from fastmcp.tools.tool import ToolResult

logger = logging.getLogger(__name__)


def _get_deployment_ids(deployment_id: str) -> tuple[str, str]:
    """デプロイメントからproject_idとmodel_idを取得"""
    deployment = dr.Deployment.get(deployment_id)
    model_meta = deployment.model
    project_id = model_meta.get("project_id") or model_meta.get("project", {}).get("id")
    model_id = model_meta.get("id")
    if not project_id or not model_id:
        raise ToolError(f"デプロイメント {deployment_id} からproject_id/model_idを取得できません。")
    return project_id, model_id


@dr_mcp_tool(tags={"insights", "feature-impact"})
async def get_feature_impact(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
) -> ToolResult:
    """モデルのFeature Impact（特徴量重要度）を取得します。各特徴量がモデル予測にどの程度影響するかを示します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        fi = model.get_or_request_feature_impact()
        features = [
            {
                "feature_name": item["featureName"],
                "impact_normalized": item["impactNormalized"],
                "impact_unnormalized": item["impactUnnormalized"],
                "redundant_with": item.get("redundantWith"),
            }
            for item in fi
        ]
        return ToolResult(structured_content={"features": features, "count": len(features)})
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"Feature Impact取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "roc"})
async def get_roc_curve(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    source: Annotated[str, "データソース: validation, crossValidation, holdout"] = "validation",
) -> ToolResult:
    """ROC曲線データとAUCを取得します。モデルの分類性能を評価します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        roc = model.get_roc_curve(source)
        roc_points = [
            {
                "threshold": pt["threshold"],
                "false_positive_rate": pt["false_positive_rate"],
                "true_positive_rate": pt["true_positive_rate"],
            }
            for pt in roc.roc_points
        ]
        return ToolResult(structured_content={"auc": roc.auc, "source": source, "roc_points": roc_points})
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"ROC曲線取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "lift"})
async def get_lift_chart(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    source: Annotated[str, "データソース: validation, crossValidation, holdout"] = "validation",
) -> ToolResult:
    """リフトチャートデータを取得します。モデルの予測精度をビン別に比較します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        lift = model.get_lift_chart(source)
        bins = [
            {
                "bin_weight": b.get("bin_weight", b.get("binWeight", 0)),
                "actual": b["actual"],
                "predicted": b["predicted"],
            }
            for b in lift.bins
        ]
        return ToolResult(structured_content={"source": source, "bins": bins})
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"リフトチャート取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "confusion-matrix"})
async def get_confusion_matrix(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    threshold: Annotated[float, "分類閾値 (0.0-1.0)"] = 0.5,
    source: Annotated[str, "データソース: validation, crossValidation, holdout"] = "validation",
) -> ToolResult:
    """混同行列を取得します。指定した閾値でのTP/FP/TN/FNと精度メトリクスを返します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        roc = model.get_roc_curve(source)

        closest = min(roc.roc_points, key=lambda pt: abs(pt["threshold"] - threshold))
        tp = closest.get("true_positive_count", 0)
        fp = closest.get("false_positive_count", 0)
        tn = closest.get("true_negative_count", 0)
        fn = closest.get("false_negative_count", 0)

        total = tp + fp + tn + fn
        accuracy = (tp + tn) / total if total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return ToolResult(structured_content={
            "threshold": closest["threshold"],
            "source": source,
            "classes": ["0", "1"],
            "matrix": [[tn, fp], [fn, tp]],
            "metrics": {
                "accuracy": round(accuracy, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
            },
        })
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"混同行列取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "accuracy"})
async def get_model_accuracy(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
) -> ToolResult:
    """モデルの精度メトリクス（AUC, F1, LogLoss, Accuracy等）を取得します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        metrics_data = model.metrics
        optimization_metric = getattr(model, "optimization_metric", "LogLoss")

        metrics_list = []
        for name, sources in metrics_data.items():
            if isinstance(sources, dict) and "validation" in sources:
                val = sources["validation"]
                if val is not None:
                    metrics_list.append({"name": name, "value": val, "source": "validation"})

        return ToolResult(structured_content={
            "metrics": metrics_list,
            "optimization_metric": optimization_metric,
        })
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"精度メトリクス取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "feature-effects"})
async def get_feature_effects(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    feature_name: Annotated[str, "分析対象の特徴量名"],
) -> ToolResult:
    """指定した特徴量のFeature Effects（特徴量効果）データを取得します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")
    if not feature_name or not feature_name.strip():
        raise ToolError("feature_name は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        fe = model.get_or_request_feature_effect()

        for item in fe.feature_effects:
            if item["feature_name"] == feature_name:
                pd_data = [
                    {"label": str(pt["label"]), "dependence": pt["partial_dependence"]}
                    for pt in item["partial_dependence"]["data"]
                ]
                return ToolResult(structured_content={
                    "feature_name": feature_name,
                    "feature_type": item.get("feature_type", "unknown"),
                    "partial_dependence": pd_data,
                })

        return ToolResult(structured_content={
            "feature_name": feature_name,
            "feature_type": "unknown",
            "partial_dependence": [],
            "message": f"特徴量 '{feature_name}' のFeature Effectsデータが見つかりません。",
        })
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"Feature Effects取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "partial-dependence"})
async def get_partial_dependence(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    feature_name: Annotated[str, "分析対象の特徴量名"],
) -> ToolResult:
    """指定した特徴量のPartial Dependence Plot (PDP)データを取得します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")
    if not feature_name or not feature_name.strip():
        raise ToolError("feature_name は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        fe = model.get_or_request_feature_effect()

        for item in fe.feature_effects:
            if item["feature_name"] == feature_name:
                data = [
                    {"value": pt["label"], "mean_prediction": pt["partial_dependence"]}
                    for pt in item["partial_dependence"]["data"]
                ]
                return ToolResult(structured_content={
                    "feature_name": feature_name,
                    "feature_type": item.get("feature_type", "unknown"),
                    "data": data,
                })

        return ToolResult(structured_content={
            "feature_name": feature_name,
            "feature_type": "unknown",
            "data": [],
            "message": f"特徴量 '{feature_name}' のPDPデータが見つかりません。",
        })
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"PDP取得に失敗: {e}")


@dr_mcp_tool(tags={"insights", "word-cloud"})
async def get_word_cloud(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
) -> ToolResult:
    """テキスト特徴量のWord Cloud（重要語句）データを取得します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        project_id, model_id = _get_deployment_ids(deployment_id)
        model = dr.Model.get(project=project_id, model_id=model_id)
        try:
            wc = model.get_word_cloud()
            words = [
                {"text": w["ngram"], "weight": w["coefficient"], "class": w.get("class", "neutral")}
                for w in wc.ngrams
            ]
        except Exception:
            words = []

        return ToolResult(structured_content={"words": words})
    except ToolError:
        raise
    except Exception as e:
        raise ToolError(f"Word Cloud取得に失敗: {e}")
