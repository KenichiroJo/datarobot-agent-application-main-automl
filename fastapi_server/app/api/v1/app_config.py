import logging

from fastapi import APIRouter, Request

from app.auth.ctx import must_get_auth_ctx

logger = logging.getLogger(__name__)

app_config_router = APIRouter(prefix="/config", tags=["config"])


@app_config_router.get("")
async def get_app_config(request: Request) -> dict:
    """Return application configuration for the frontend."""
    await must_get_auth_ctx(request)
    config = request.app.state.deps.config
    return {
        "deploymentId": config.prediction_deployment_id,
        "datasetId": config.scoring_dataset_id,
    }
