const all = ['insights'];
export const insightsKeys = {
  all,
  deployment: (id: string) => [...all, id],
  featureImpact: (id: string) => [...all, id, 'feature-impact'],
  roc: (id: string, source?: string) => [...all, id, 'roc', source ?? 'validation'],
  lift: (id: string, source?: string) => [...all, id, 'lift', source ?? 'validation'],
  confusionMatrix: (id: string, threshold?: number, source?: string) => [
    ...all, id, 'confusion-matrix', threshold ?? 0.5, source ?? 'validation',
  ],
  accuracy: (id: string) => [...all, id, 'accuracy'],
  featureEffects: (id: string, feature: string) => [...all, id, 'feature-effects', feature],
  partialDependence: (id: string, feature: string) => [...all, id, 'partial-dependence', feature],
  wordCloud: (id: string) => [...all, id, 'word-cloud'],
};
