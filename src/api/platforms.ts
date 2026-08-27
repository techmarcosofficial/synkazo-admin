import apiClient from './apiClient';

import type { PlatformId } from '@/types/connection';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

// Shape actually returned by GET /platforms (see backend PlatformsController) —
// distinct from the static marketing `Platform` type in @/types/connection.
export interface SyncPlatform {
  platformId: PlatformId;
  label: string;
  supportsOAuth: boolean;
  supportsEnvironments: boolean;
}

export const platformsApi = {
  list: (): Promise<SyncPlatform[]> => apiClient.get('/platforms').then(d),
};
