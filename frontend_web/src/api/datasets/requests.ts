import apiClient from '../apiClient';
import type { DatasetRecordsResponse, DatasetSchemaResponse } from './types';

export async function getDatasetRecords(datasetId: string, offset = 0, limit = 20) {
  return apiClient.get<DatasetRecordsResponse>(`/v1/datasets/${datasetId}/records`, {
    params: { offset, limit },
  });
}

export async function getDatasetSchema(datasetId: string) {
  return apiClient.get<DatasetSchemaResponse>(`/v1/datasets/${datasetId}/schema`);
}
