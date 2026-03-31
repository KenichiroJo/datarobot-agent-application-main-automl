export interface FeatureImpactItem {
  featureName: string;
  impactNormalized: number;
  impactUnnormalized: number;
  redundantWith: string | null;
}

export interface FeatureImpactResponse {
  features: FeatureImpactItem[];
  count: number;
  ranAt?: string;
}

export interface ROCPoint {
  threshold: number;
  falsePositiveRate: number;
  truePositiveRate: number;
}

export interface ROCCurveResponse {
  auc: number;
  source: string;
  rocPoints: ROCPoint[];
}

export interface LiftBin {
  binWeight: number;
  actual: number;
  predicted: number;
}

export interface LiftChartResponse {
  source: string;
  bins: LiftBin[];
}

export interface ConfusionMatrixResponse {
  threshold: number;
  source: string;
  classes: string[];
  matrix: number[][];
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
}

export interface MetricItem {
  name: string;
  value: number;
  source: string;
}

export interface AccuracyResponse {
  metrics: MetricItem[];
  optimizationMetric: string;
}

export interface FeatureEffectPoint {
  label: string;
  dependence: number;
}

export interface FeatureEffectsResponse {
  featureName: string;
  featureType: string;
  partialDependence: FeatureEffectPoint[];
}

export interface PartialDependencePoint {
  value: number | string;
  meanPrediction: number;
}

export interface PartialDependenceResponse {
  featureName: string;
  featureType: string;
  data: PartialDependencePoint[];
}

export interface WordCloudItem {
  text: string;
  weight: number;
  class: string;
}

export interface WordCloudResponse {
  words: WordCloudItem[];
}

export interface DeploymentInfoResponse {
  deploymentId: string;
  projectId: string;
  modelId: string;
  target: string;
  targetType: string;
  positiveClass: string | null;
  predictionThreshold: number | null;
  modelType: string;
  featureNames: string[];
  createdAt: string;
}
