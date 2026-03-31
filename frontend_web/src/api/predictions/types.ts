export interface ExplanationItem {
  featureName: string;
  featureValue: any;
  strength: number;
  qualitativeStrength: string;
  label: string;
}

export interface PredictionRequest {
  deploymentId: string;
  data: Record<string, any>;
  maxExplanations?: number;
}

export interface PredictionResponse {
  prediction: string;
  predictionProbability: number;
  classProbabilities: Record<string, number>;
  explanations: ExplanationItem[];
  ngramExplanations: any[];
}
