import apiClient from '../apiClient';
import type {
  AccuracyResponse,
  ConfusionMatrixResponse,
  DeploymentInfoResponse,
  FeatureEffectsResponse,
  FeatureImpactResponse,
  LiftChartResponse,
  PartialDependenceResponse,
  ROCCurveResponse,
  WordCloudResponse,
} from './types';

export async function getDeploymentInfo(deploymentId: string) {
  return apiClient.get<DeploymentInfoResponse>(`/v1/insights/${deploymentId}`);
}

export async function getFeatureImpact(deploymentId: string) {
  return apiClient.get<FeatureImpactResponse>(`/v1/insights/${deploymentId}/feature-impact`);
}

export async function getROCCurve(deploymentId: string, source = 'validation') {
  return apiClient.get<ROCCurveResponse>(`/v1/insights/${deploymentId}/roc`, {
    params: { source },
  });
}

export async function getLiftChart(deploymentId: string, source = 'validation') {
  return apiClient.get<LiftChartResponse>(`/v1/insights/${deploymentId}/lift`, {
    params: { source },
  });
}

export async function getConfusionMatrix(
  deploymentId: string,
  threshold = 0.5,
  source = 'validation',
) {
  return apiClient.get<ConfusionMatrixResponse>(
    `/v1/insights/${deploymentId}/confusion-matrix`,
    { params: { threshold, source } },
  );
}

export async function getAccuracy(deploymentId: string) {
  return apiClient.get<AccuracyResponse>(`/v1/insights/${deploymentId}/accuracy`);
}

export async function getFeatureEffects(deploymentId: string, featureName: string) {
  return apiClient.get<FeatureEffectsResponse>(
    `/v1/insights/${deploymentId}/feature-effects/${encodeURIComponent(featureName)}`,
  );
}

export async function getPartialDependence(deploymentId: string, featureName: string) {
  return apiClient.get<PartialDependenceResponse>(
    `/v1/insights/${deploymentId}/partial-dependence/${encodeURIComponent(featureName)}`,
  );
}

export async function getWordCloud(deploymentId: string) {
  return apiClient.get<WordCloudResponse>(`/v1/insights/${deploymentId}/word-cloud`);
}
