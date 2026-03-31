import { useQuery } from '@tanstack/react-query';
import { datasetsKeys } from './keys';
import { getDatasetRecords, getDatasetSchema } from './requests';

const staleTime = 60 * 1000;

export function useDatasetRecords(datasetId: string, offset = 0, limit = 20) {
  return useQuery({
    queryKey: datasetsKeys.records(datasetId, offset, limit),
    queryFn: () => getDatasetRecords(datasetId, offset, limit),
    select: (res) => res.data,
    enabled: !!datasetId,
    staleTime,
  });
}

export function useDatasetSchema(datasetId: string) {
  return useQuery({
    queryKey: datasetsKeys.schema(datasetId),
    queryFn: () => getDatasetSchema(datasetId),
    select: (res) => res.data,
    enabled: !!datasetId,
    staleTime,
  });
}
