import logging

from fastapi import APIRouter, Query, Request

from app.auth.ctx import must_get_auth_ctx
from app.services.datarobot_client import DataRobotClient

from .schemas.datasets import DatasetRecordsResponse, DatasetSchemaResponse

logger = logging.getLogger(__name__)

datasets_router = APIRouter(prefix="/datasets", tags=["datasets"])


@datasets_router.get("/{dataset_id}/records", response_model=DatasetRecordsResponse)
async def get_dataset_records(
    dataset_id: str,
    request: Request,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> DatasetRecordsResponse:
    await must_get_auth_ctx(request)
    client: DataRobotClient = request.app.state.deps.datarobot_client
    data = client.get_dataset_records(dataset_id, offset, limit)
    return DatasetRecordsResponse(**data)


@datasets_router.get("/{dataset_id}/schema", response_model=DatasetSchemaResponse)
async def get_dataset_schema(
    dataset_id: str,
    request: Request,
) -> DatasetSchemaResponse:
    await must_get_auth_ctx(request)
    client: DataRobotClient = request.app.state.deps.datarobot_client
    data = client.get_dataset_schema(dataset_id)
    return DatasetSchemaResponse(**data)
