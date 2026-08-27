import apiClient from './apiClient';

import type { TwoWaySyncInterval } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

const base = '/admin/two-way-sync/intervals';

// Super-admin-only "Two-Way Sync Time" settings — per source platform polling
// interval. Regular users cannot schedule two-way sync at all (item 5).
export const twoWaySyncApi = {
  listIntervals: (): Promise<TwoWaySyncInterval[]> =>
    apiClient.get(base).then(d),
  setInterval: (
    platformId: string,
    intervalMinutes: number,
  ): Promise<TwoWaySyncInterval> =>
    apiClient.put(`${base}/${platformId}`, { intervalMinutes }).then(d),
  resetInterval: (platformId: string): Promise<TwoWaySyncInterval> =>
    apiClient.delete(`${base}/${platformId}`).then(d),
};
