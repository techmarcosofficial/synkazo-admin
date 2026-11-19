import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import type {
  ListTrashParams,
  TrashDeleteImpact,
  TrashEntityType,
  TrashItem,
} from './trashTypes';

import { createIdempotencyKey } from '@/lib/idempotency';
import type { SuperAdminPage } from '@/types';

// Privileged-mutation routes are @Idempotent on the server: a fresh key per
// operator intent satisfies the required Idempotency-Key header.
const idempotent = () => ({
  headers: { 'Idempotency-Key': createIdempotencyKey() },
});

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const paginated = ({
  data,
}: AxiosResponse<PaginatedEnvelope<TrashItem>>): SuperAdminPage<TrashItem> => ({
  data: data.data,
  total: data.total,
  page: data.page,
  limit: data.limit,
});

export const superAdminTrashApi = {
  // Platform-wide trash across every organisation.
  list: (params: ListTrashParams = {}): Promise<SuperAdminPage<TrashItem>> =>
    apiClient
      .get<PaginatedEnvelope<TrashItem>>('/super-admin/trash', { params })
      .then(paginated),

  restore: (type: TrashEntityType, id: string): Promise<void> =>
    apiClient
      .post(`/super-admin/trash/${type}/${id}/restore`, undefined, idempotent())
      .then(() => undefined),

  permanentDelete: (
    type: TrashEntityType,
    id: string,
    reason?: string,
  ): Promise<void> =>
    apiClient
      .delete(`/super-admin/trash/${type}/${id}`, {
        data: { reason },
        ...idempotent(),
      })
      .then(() => undefined),

  // ── Org-delete (cascades the org's projects & jobs to trash) ──────────────
  organisationDeleteImpact: (
    organisationId: string,
  ): Promise<TrashDeleteImpact> =>
    apiClient
      .get<{ data: TrashDeleteImpact }>(
        `/super-admin/organisations/${organisationId}/delete-impact`,
      )
      .then(d),

  deleteOrganisation: (
    organisationId: string,
    body: { confirmName: string; reason?: string },
  ): Promise<TrashDeleteImpact> =>
    apiClient
      .delete<{ data: TrashDeleteImpact }>(
        `/super-admin/organisations/${organisationId}`,
        { data: body, ...idempotent() },
      )
      .then(d),
};
