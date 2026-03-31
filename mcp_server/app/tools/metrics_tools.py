import logging
from typing import Annotated

import datarobot as dr
from datarobot_genai.drmcp import dr_mcp_tool
from fastmcp.exceptions import ToolError
from fastmcp.tools.tool import ToolResult

logger = logging.getLogger(__name__)


@dr_mcp_tool(tags={"metrics", "feedback"})
async def submit_feedback(
    deployment_id: Annotated[str, "DataRobot予測デプロイメントID"],
    association_id: Annotated[str, "予測結果のアソシエーションID"],
    actual_value: Annotated[str, "実際の結果値"],
) -> ToolResult:
    """予測結果に対するフィードバック（実績値）をDataRobotに送信します。"""

    if not deployment_id or not deployment_id.strip():
        raise ToolError("deployment_id は必須です。")
    if not association_id or not association_id.strip():
        raise ToolError("association_id は必須です。")

    try:
        deployment = dr.Deployment.get(deployment_id)
        target_name = deployment.model.get("target_name", "target")

        deployment.submit_actuals(
            data=[
                {
                    "association_id": association_id,
                    "actual_value": actual_value,
                }
            ]
        )

        logger.info(
            "Feedback submitted for deployment %s, association %s: %s",
            deployment_id,
            association_id,
            actual_value,
        )
        return ToolResult(
            structured_content={
                "status": "success",
                "message": f"フィードバックを送信しました (association_id: {association_id}, 実績値: {actual_value})",
            }
        )
    except Exception as e:
        logger.error("Feedback submission failed: %s", str(e))
        raise ToolError(f"フィードバック送信に失敗しました: {e}")
