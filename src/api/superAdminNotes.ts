import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  CreateOrganisationNoteDto,
  OrganisationNote,
  OrganisationNoteCategory,
} from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const base = (organisationId: string) =>
  `/super-admin/organisations/${organisationId}/notes`;

export const superAdminNotesApi = {
  list: (
    organisationId: string,
    category?: OrganisationNoteCategory,
  ): Promise<OrganisationNote[]> =>
    apiClient
      .get<{ data: OrganisationNote[] }>(base(organisationId), {
        params: category ? { category } : undefined,
      })
      .then(d),

  create: (
    organisationId: string,
    dto: CreateOrganisationNoteDto,
    idempotencyKey?: string,
  ): Promise<OrganisationNote> =>
    apiClient
      .post<{ data: OrganisationNote }>(base(organisationId), dto, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      })
      .then(d),

  delete: (organisationId: string, noteId: string): Promise<void> =>
    apiClient.delete(`${base(organisationId)}/${noteId}`).then(() => undefined),
};
