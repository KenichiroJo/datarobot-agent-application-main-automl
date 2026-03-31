import apiClient from '../apiClient';
import type { AppConfig } from './types';

export async function getAppConfig() {
  return apiClient.get<AppConfig>('/v1/config');
}
