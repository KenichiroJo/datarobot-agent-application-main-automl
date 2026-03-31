import logging

from fastapi import APIRouter, Request

from app.auth.ctx import must_get_auth_ctx
from app.services.datarobot_client import DataRobotClient

from .schemas.predictions import PredictionRequest, PredictionResponse

logger = logging.getLogger(__name__)

predictions_router = APIRouter(prefix="/predictions", tags=["predictions"])


@predictions_router.post("", response_model=PredictionResponse)
async def create_prediction(
    body: PredictionRequest,
    request: Request,
) -> PredictionResponse:
    must_get_auth_ctx(request)
    client: DataRobotClient = request.app.state.deps.datarobot_client
    data = client.predict(
        deployment_id=body.deployment_id,
        data=body.data,
        max_explanations=body.max_explanations,
    )
    return PredictionResponse(**data)
