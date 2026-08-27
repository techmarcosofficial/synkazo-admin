import apiClient from './apiClient';

export interface Notification {
  id: string;
  type: string;
  title?: string;
  message: string;
  data?: { jobId?: string; projectId?: string; [k: string]: unknown } | null;
  readAt?: string | null;
  createdAt: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueJobStatus {
  id: string;
  state: string;
  progress?: number;
  data?: unknown;
  failedReason?: string;
}

export const notificationsApi = {
  list: (
    params: Record<string, unknown> = {},
  ): Promise<{ data: Notification[]; total?: number }> =>
    apiClient.get('/notifications', { params }).then((r) => r.data),

  unreadCount: (): Promise<{ count: number }> =>
    apiClient.get('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string): Promise<unknown> =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: (): Promise<unknown> =>
    apiClient.patch('/notifications/read-all').then((r) => r.data),

  getQueueStats: (): Promise<{ data: QueueStats }> =>
    apiClient.get('/queue/stats').then((r) => r.data),

  removeQueueJob: (bullJobId: string): Promise<unknown> =>
    apiClient.delete(`/queue/jobs/${bullJobId}`).then((r) => r.data),

  retryQueueJob: (bullJobId: string): Promise<unknown> =>
    apiClient.post(`/queue/jobs/${bullJobId}/retry`).then((r) => r.data),

  getQueueJobStatus: (bullJobId: string): Promise<{ data: QueueJobStatus }> =>
    apiClient.get(`/queue/jobs/${bullJobId}/status`).then((r) => r.data),
};
