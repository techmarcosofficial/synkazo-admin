import axios, { type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

import { tokenStorage } from '@/lib/tokenStorage';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _suppressGlobalError?: boolean;
}

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Needed for the browser to accept/send the sb_logged_in cookie the API sets on
  // login/logout — it's a cross-origin request (dashboard vs api), and cross-origin
  // responses drop Set-Cookie unless the request opted into credentials.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The backend rotates (and revokes) the refresh token on every /auth/refresh
// call, so several 401s firing at once in this tab must share one refresh
// instead of each racing the others with a token that's about to be revoked.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStorage.getToken('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      try {
        const { data } = await axios.post<{
          data: { accessToken: string; refreshToken: string };
        }>(`${BASE_URL}/auth/refresh`, { refreshToken });
        tokenStorage.updateTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });
        return data.data.accessToken;
      } catch (err) {
        // Refresh tokens are shared (localStorage) but single-use — another tab
        // may have already rotated this one and written fresh tokens. Reuse
        // those instead of forcing every open tab to log out over a lost race.
        const currentRefreshToken = tokenStorage.getToken('refreshToken');
        const currentAccessToken = tokenStorage.getToken('accessToken');
        if (
          currentRefreshToken &&
          currentRefreshToken !== refreshToken &&
          currentAccessToken
        ) {
          return currentAccessToken;
        }
        throw err;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as RetryableConfig;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/verify-email') &&
      !original.url?.includes('/marketplace/hubspot/handoff')
    ) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        tokenStorage.clearTokens();
        toast.error('Your session has expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    if (
      error.response?.status >= 500 &&
      !(original as RetryableConfig)._suppressGlobalError
    ) {
      const msg =
        error.response?.data?.message || 'Server error. Please try again.';
      toast.error(
        typeof msg === 'string' ? msg : 'Server error. Please try again.',
      );
    }
    return Promise.reject(error);
  },
);

export default apiClient;
