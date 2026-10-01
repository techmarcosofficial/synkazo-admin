import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type { PlanDefaults, UpsertPlanDefaultsDto } from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

export const superAdminPlanDefaultsApi = {
  get: (): Promise<PlanDefaults> =>
    apiClient
      .get<{ data: PlanDefaults }>('/super-admin/settings/plan-defaults')
      .then(d),

  upsert: (
    dto: UpsertPlanDefaultsDto,
    idempotencyKey?: string,
  ): Promise<PlanDefaults> =>
    apiClient
      .put<{ data: PlanDefaults }>(
        '/super-admin/settings/plan-defaults',
        dto,
        {
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
        },
      )
      .then(d),
};
