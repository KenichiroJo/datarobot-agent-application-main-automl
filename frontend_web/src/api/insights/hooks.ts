import { useQuery } from '@tanstack/react-query';
import { insightsKeys } from './keys';
import {
  getAccuracy,
  getConfusionMatrix,
  getDeploymentInfo,
  getFeatureEffects,
  getFeatureImpact,
  getLiftChart,
  getPartialDependence,
  getROCCurve,
  getWordCloud,
} from './requests';

const staleTime = 60 * 1000;

export function useDeploymentInfo(deploymentId: string) {
  return useQuery({
    queryKey: insightsKeys.deployment(deploymentId),
    queryFn: () => getDeploymentInfo(deploymentId),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useFeatureImpact(deploymentId: string) {
  return useQuery({
    queryKey: insightsKeys.featureImpact(deploymentId),
    queryFn: () => getFeatureImpact(deploymentId),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useROCCurve(deploymentId: string, source = 'validation') {
  return useQuery({
    queryKey: insightsKeys.roc(deploymentId, source),
    queryFn: () => getROCCurve(deploymentId, source),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useLiftChart(deploymentId: string, source = 'validation') {
  return useQuery({
    queryKey: insightsKeys.lift(deploymentId, source),
    queryFn: () => getLiftChart(deploymentId, source),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useConfusionMatrix(deploymentId: string, threshold = 0.5, source = 'validation') {
  return useQuery({
    queryKey: insightsKeys.confusionMatrix(deploymentId, threshold, source),
    queryFn: () => getConfusionMatrix(deploymentId, threshold, source),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useAccuracy(deploymentId: string) {
  return useQuery({
    queryKey: insightsKeys.accuracy(deploymentId),
    queryFn: () => getAccuracy(deploymentId),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}

export function useFeatureEffects(deploymentId: string, featureName: string) {
  return useQuery({
    queryKey: insightsKeys.featureEffects(deploymentId, featureName),
    queryFn: () => getFeatureEffects(deploymentId, featureName),
    select: (res) => res.data,
    enabled: !!deploymentId && !!featureName,
    staleTime,
  });
}

export function usePartialDependence(deploymentId: string, featureName: string) {
  return useQuery({
    queryKey: insightsKeys.partialDependence(deploymentId, featureName),
    queryFn: () => getPartialDependence(deploymentId, featureName),
    select: (res) => res.data,
    enabled: !!deploymentId && !!featureName,
    staleTime,
  });
}

export function useWordCloud(deploymentId: string) {
  return useQuery({
    queryKey: insightsKeys.wordCloud(deploymentId),
    queryFn: () => getWordCloud(deploymentId),
    select: (res) => res.data,
    enabled: !!deploymentId,
    staleTime,
  });
}
