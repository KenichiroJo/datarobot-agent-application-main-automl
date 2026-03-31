import logging

from fastapi import APIRouter, Query, Request

from app.auth.ctx import must_get_auth_ctx
from app.services.datarobot_client import DataRobotClient

from .schemas.insights import (
    AccuracyResponse,
    ConfusionMatrixResponse,
    DeploymentInfoResponse,
    FeatureEffectsResponse,
    FeatureImpactResponse,
    LiftChartResponse,
    PartialDependenceResponse,
    ROCCurveResponse,
    WordCloudResponse,
)

logger = logging.getLogger(__name__)

insights_router = APIRouter(prefix="/insights", tags=["insights"])


def _get_client(request: Request) -> DataRobotClient:
    return request.app.state.deps.datarobot_client


def _get_ids(client: DataRobotClient, deployment_id: str) -> tuple[str, str]:
    info = client.get_deployment_info(deployment_id)
    return info["projectId"], info["modelId"]


@insights_router.get("/{deployment_id}", response_model=DeploymentInfoResponse)
async def get_deployment_info(
    deployment_id: str, request: Request
) -> DeploymentInfoResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    data = client.get_deployment_info(deployment_id)
    return DeploymentInfoResponse(**data)


@insights_router.get(
    "/{deployment_id}/feature-impact", response_model=FeatureImpactResponse
)
async def get_feature_impact(
    deployment_id: str, request: Request
) -> FeatureImpactResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_feature_impact(project_id, model_id)
    return FeatureImpactResponse(**data)


@insights_router.get("/{deployment_id}/roc", response_model=ROCCurveResponse)
async def get_roc_curve(
    deployment_id: str,
    request: Request,
    source: str = Query(default="validation"),
) -> ROCCurveResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_roc_curve(project_id, model_id, source)
    return ROCCurveResponse(**data)


@insights_router.get("/{deployment_id}/lift", response_model=LiftChartResponse)
async def get_lift_chart(
    deployment_id: str,
    request: Request,
    source: str = Query(default="validation"),
) -> LiftChartResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_lift_chart(project_id, model_id, source)
    return LiftChartResponse(**data)


@insights_router.get(
    "/{deployment_id}/confusion-matrix", response_model=ConfusionMatrixResponse
)
async def get_confusion_matrix(
    deployment_id: str,
    request: Request,
    threshold: float = Query(default=0.5, ge=0.0, le=1.0),
    source: str = Query(default="validation"),
) -> ConfusionMatrixResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_confusion_matrix(project_id, model_id, threshold, source)
    return ConfusionMatrixResponse(**data)


@insights_router.get("/{deployment_id}/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    deployment_id: str, request: Request
) -> AccuracyResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_accuracy_metrics(project_id, model_id)
    return AccuracyResponse(**data)


@insights_router.get(
    "/{deployment_id}/feature-effects/{feature_name}",
    response_model=FeatureEffectsResponse,
)
async def get_feature_effects(
    deployment_id: str,
    feature_name: str,
    request: Request,
) -> FeatureEffectsResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_feature_effects(project_id, model_id, feature_name)
    return FeatureEffectsResponse(**data)


@insights_router.get(
    "/{deployment_id}/partial-dependence/{feature_name}",
    response_model=PartialDependenceResponse,
)
async def get_partial_dependence(
    deployment_id: str,
    feature_name: str,
    request: Request,
) -> PartialDependenceResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_partial_dependence(project_id, model_id, feature_name)
    return PartialDependenceResponse(**data)


@insights_router.get(
    "/{deployment_id}/word-cloud", response_model=WordCloudResponse
)
async def get_word_cloud(
    deployment_id: str, request: Request
) -> WordCloudResponse:
    await must_get_auth_ctx(request)
    client = _get_client(request)
    project_id, model_id = _get_ids(client, deployment_id)
    data = client.get_word_cloud(project_id, model_id)
    return WordCloudResponse(**data)
