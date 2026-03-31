import logging
import os

from fastapi import APIRouter, Request

from app.auth.ctx import must_get_auth_ctx

logger = logging.getLogger(__name__)

app_config_router = APIRouter(prefix="/config", tags=["config"])


@app_config_router.get("")
async def get_app_config(request: Request) -> dict:
    """Return application configuration for the frontend."""
    await must_get_auth_ctx(request)
    config = request.app.state.deps.config
    deployment_id = config.prediction_deployment_id or os.environ.get("PREDICTION_DEPLOYMENT_ID", "")
    dataset_id = config.scoring_dataset_id or os.environ.get("SCORING_DATASET_ID", "")
    return {
        "deploymentId": deployment_id,
        "datasetId": dataset_id,
    }
