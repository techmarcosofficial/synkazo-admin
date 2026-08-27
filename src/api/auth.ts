import apiClient from './apiClient';

import type { ApiResponse } from '@/types';

export const authApi = {
  verifyEmail: (token: string): Promise<ApiResponse<null>> =>
    apiClient.post('/auth/verify-email', { token }).then((r) => r.data),

  resendVerification: (email: string): Promise<ApiResponse<null>> =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data),
};
