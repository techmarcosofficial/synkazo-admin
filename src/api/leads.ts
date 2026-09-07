import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';
import type { Lead, LeadNotificationSettings, LeadStatus } from '@/types/lead';

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
  getNotificationSettings: () =>
    apiClient
      .get<{ success: boolean; data: LeadNotificationSettings }>(
        '/admin/leads/notification-settings',
      )
      .then((response) => response.data.data),
  updateNotificationSettings: (additionalRecipients: string[]) =>
    apiClient
      .patch<{ success: boolean; data: LeadNotificationSettings }>(
        '/admin/leads/notification-settings',
        { additionalRecipients },
      )
      .then((response) => response.data.data),
};
