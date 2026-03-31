import apiClient from '../apiClient';
import type { PredictionRequest, PredictionResponse } from './types';

export async function createPrediction(body: PredictionRequest) {
  return apiClient.post<PredictionResponse>('/v1/predictions', body);
}
