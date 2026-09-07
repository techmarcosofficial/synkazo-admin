import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';
import type { Lead, LeadStatus } from '@/types/lead';

interface ListLeadsParams {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
}

export const leadsApi = {
  list: ({ page = 1, limit = 20, status, search }: ListLeadsParams = {}) =>
    apiClient
      .get<PaginatedResponse<Lead>>('/admin/leads', {
        params: { page, limit, status, search },
      })
      .then((response) => response.data),
  update: (id: string, data: { status?: LeadStatus; adminNotes?: string }) =>
    apiClient
      .patch<{ success: boolean; data: Lead }>(`/admin/leads/${id}`, data)
      .then((response) => response.data.data),
};
