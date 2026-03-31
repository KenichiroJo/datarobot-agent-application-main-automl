import { useQuery } from '@tanstack/react-query';
import { configKeys } from './keys';
import { getAppConfig } from './requests';

export function useAppConfig() {
  return useQuery({
    queryKey: configKeys.appConfig,
    queryFn: async () => {
      const res = await getAppConfig();
      return res.data;
    },
    staleTime: Infinity,
  });
}
