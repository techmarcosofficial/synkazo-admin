import apiClient from './apiClient';

import type { ApiResponse } from '@/types';

const base = '/system-settings/auth-pages';

export type AuthPagesSettings = {
  login: boolean;
  register: boolean;
};

export const authPagesSettingsApi = {
  get: (): Promise<AuthPagesSettings> =>
    apiClient.get(base).then((r) => r.data.data),

  enablePage: (page: 'login' | 'register'): Promise<ApiResponse<null>> =>
    apiClient.post(`${base}/${page}/enable`).then((r) => r.data),

  disablePage: (page: 'login' | 'register'): Promise<ApiResponse<null>> =>
    apiClient.post(`${base}/${page}/disable`).then((r) => r.data),
};
