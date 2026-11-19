import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import type { ListTrashParams, TrashEntityType, TrashItem } from './trashTypes';

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TrashPage {
  data: TrashItem[];
  total: number;
  page: number;
  limit: number;
}

const paginated = ({
  data,
}: AxiosResponse<PaginatedEnvelope<TrashItem>>): TrashPage => ({
  data: data.data,
  total: data.total,
  page: data.page,
  limit: data.limit,
});

// Org-scoped trash: the caller's own organisation's deleted projects & jobs.
// Restore only — permanent delete is a super-admin action.
export const trashApi = {
  list: (params: ListTrashParams = {}): Promise<TrashPage> =>
    apiClient
      .get<PaginatedEnvelope<TrashItem>>('/trash', { params })
      .then(paginated),

  restore: (type: TrashEntityType, id: string): Promise<void> =>
    apiClient.post(`/trash/${type}/${id}/restore`).then(() => undefined),
};
