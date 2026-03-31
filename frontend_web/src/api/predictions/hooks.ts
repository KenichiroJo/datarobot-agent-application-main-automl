import { useMutation } from '@tanstack/react-query';
import { createPrediction } from './requests';
import type { PredictionRequest } from './types';

export function useCreatePrediction() {
  return useMutation({
    mutationFn: (body: PredictionRequest) => createPrediction(body).then((res) => res.data),
  });
}
