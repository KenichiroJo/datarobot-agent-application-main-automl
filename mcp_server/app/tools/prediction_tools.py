import json
import logging
from typing import Annotated, Any

import datarobot as dr
import pandas as pd
from datarobot_predict.deployment import (
    PredictionResult,
    _deployment_predict,
    _read_response_csv,
)
from datarobot_genai.drmcp import dr_mcp_tool
from fastmcp.exceptions import ToolError
from fastmcp.tools.tool import ToolResult

logger = logging.getLogger(__name__)


@dr_mcp_tool(tags={"prediction", "customer"})
async def predict_customer(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    customer_data: Annotated[str, "予測対象の顧客データ（JSON文字列）。例: {\"annual_inc\": 65000, \"dti\": 12.5}"],
    max_explanations: Annotated[int, "返却する特徴量説明の最大数"] = 10,
) -> ToolResult:
    """顧客データを使ってDataRobot予測デプロイメントで予測を実行し、予測確率と特徴量説明を返します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")

    try:
        data = json.loads(customer_data) if isinstance(customer_data, str) else customer_data
    except json.JSONDecodeError as e:
        raise ToolError(f"customer_data のJSON解析に失敗しました: {e}")

    try:
        deployment = dr.Deployment.get(deployment_id)
        target_name = deployment.model.get("target_name", "target")
        df = pd.DataFrame([data])

        params: dict[str, Any] = {"maxExplanations": max_explanations}
        response = _deployment_predict(
            deployment=deployment,
            endpoint="predictions",
            headers={},
            params=params,
            data=df,
            stream=False,
            timeout=600,
            prediction_endpoint=None,
        )
        prediction_result = PredictionResult(_read_response_csv(response), response.headers)
        pred_df = prediction_result.dataframe
        pred_row = pred_df.iloc[0].to_dict()

        pred_col = f"{target_name}_PREDICTION"
        prediction = str(pred_row.get(pred_col, pred_row.get("prediction", "")))

        class_probs: dict[str, float] = {}
        for col in pred_df.columns:
            if col.endswith("_PREDICTION") and col != pred_col:
                class_name = col.replace("_PREDICTION", "").replace(f"{target_name}_", "")
                class_probs[class_name] = float(pred_row[col])

        explanations = []
        for i in range(1, max_explanations + 1):
            feat_col = f"EXPLANATION_{i}_FEATURE_NAME"
            if feat_col not in pred_row or pd.isna(pred_row.get(feat_col)):
                break
            explanations.append({
                "feature_name": pred_row[feat_col],
                "feature_value": pred_row.get(f"EXPLANATION_{i}_ACTUAL_VALUE"),
                "strength": float(pred_row.get(f"EXPLANATION_{i}_STRENGTH", 0)),
                "qualitative_strength": pred_row.get(f"EXPLANATION_{i}_QUALITATIVE_STRENGTH", ""),
                "label": pred_row.get(f"EXPLANATION_{i}_LABEL", prediction),
            })

        result = {
            "prediction": prediction,
            "prediction_probability": class_probs.get(prediction, 0.0),
            "class_probabilities": class_probs,
            "explanations": explanations,
        }

        logger.info("Prediction completed for deployment %s: %s", deployment_id, prediction)
        return ToolResult(structured_content=result)

    except Exception as e:
        logger.error("Prediction failed: %s", str(e))
        raise ToolError(f"予測実行に失敗しました: {e}")


@dr_mcp_tool(tags={"dataset", "records"})
async def get_dataset_records(
    dataset_id: Annotated[str, "DataRobotデータセットID"],
    offset: Annotated[int, "取得開始位置"] = 0,
    limit: Annotated[int, "取得件数（最大100）"] = 20,
) -> ToolResult:
    """DataRobotデータセットからレコードを取得します。顧客データの参照に使用します。"""

    if not dataset_id or not dataset_id.strip():
        raise ToolError("dataset_id は必須です。")

    try:
        dataset = dr.Dataset.get(dataset_id)
        df = dataset.get_as_dataframe()
        total = len(df)
        sliced = df.iloc[offset : offset + min(limit, 100)]
        records = sliced.to_dict(orient="records")
        for record in records:
            for key, val in record.items():
                if pd.isna(val):
                    record[key] = None

        result = {
            "records": records,
            "total": total,
            "offset": offset,
            "limit": limit,
            "columns": list(df.columns),
        }

        logger.info("Retrieved %d records from dataset %s", len(records), dataset_id)
        return ToolResult(structured_content=result)

    except Exception as e:
        logger.error("Dataset record retrieval failed: %s", str(e))
        raise ToolError(f"データセットレコード取得に失敗しました: {e}")
