import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  CreateSuperAdminDto,
  DeactivateSuperAdminDto,
  ReactivateSuperAdminDto,
  SuperAdminDirectoryEntry,
} from '@/types';

// CAP-006 / CAP-007 — Super Admin directory client.

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const base = '/super-admin/platform/super-admins';

const withKey = (idempotencyKey?: string) =>
  idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;

export const superAdminDirectoryApi = {
  list: (): Promise<SuperAdminDirectoryEntry[]> =>
    apiClient
      .get<{ data: SuperAdminDirectoryEntry[] }>(base)
      .then(d),

  create: (
    dto: CreateSuperAdminDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminDirectoryEntry> =>
    apiClient
      .post<{ data: SuperAdminDirectoryEntry }>(base, dto, withKey(idempotencyKey))
      .then(d),

  deactivate: (
    userId: string,
    dto: DeactivateSuperAdminDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminDirectoryEntry> =>
    apiClient
      .post<{ data: SuperAdminDirectoryEntry }>(
        `${base}/${userId}/deactivate`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),

  reactivate: (
    userId: string,
    dto: ReactivateSuperAdminDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminDirectoryEntry> =>
    apiClient
      .post<{ data: SuperAdminDirectoryEntry }>(
        `${base}/${userId}/reactivate`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),
};
