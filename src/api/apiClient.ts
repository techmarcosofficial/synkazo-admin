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

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const request = () =>
        axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
      const rotate = async () => {
        try {
          return await request();
        } catch (error) {
          // Another tab may have just rotated the shared cookie. Retry once
          // after its Set-Cookie response has reached the browser.
          if (!axios.isAxiosError(error) || error.response?.status !== 401)
            throw error;
          await new Promise((resolve) => setTimeout(resolve, 150));
          return request();
        }
      };
      const { data } = navigator.locks
        ? await navigator.locks.request('synkazo-refresh', rotate)
        : await rotate();
      tokenStorage.updateTokens(data.data);
      return data.data.accessToken;
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
      !original.url?.includes('/auth/logout') &&
      !original.url?.includes('/auth/refresh') &&
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
      // GAP-030 — surface the correlation id so an operator can pass
      // it to support. The API sets it as `X-Correlation-Id` on every
      // response (header) and also echoes it into the error body for
      // clients that can't read the header cross-origin.
      const correlationId =
        (error.response?.data as { correlationId?: string } | undefined)
          ?.correlationId ??
        (error.response?.headers?.['x-correlation-id'] as string | undefined);
      const label =
        typeof msg === 'string' ? msg : 'Server error. Please try again.';
      toast.error(correlationId ? `${label} (ref: ${correlationId})` : label);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
