const all = ['predictions'];
export const predictionsKeys = {
  all,
  predict: (deploymentId: string) => [...all, deploymentId],
};
