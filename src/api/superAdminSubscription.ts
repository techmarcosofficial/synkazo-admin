import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import { createIdempotencyKey } from '@/lib/idempotency';

import type {
  CancelAtPeriodEndDto,
  CancelAtPeriodEndResponse,
  CancelSubscriptionImmediateDto,
  CancelSubscriptionImmediateResponse,
  ResumeSubscriptionDto,
  ResumeSubscriptionResponse,
} from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

// SA-703/704 subscription lifecycle commands. One method per intent —
// the doc bans consolidating cancel-at-period-end / immediate cancel /
// resume behind a single generic command, and the API is shaped so we
// can't accidentally do it here either (different DTOs, different
// paths, different response types).
export const superAdminSubscriptionApi = {
  cancelAtPeriodEnd: (
    organisationId: string,
    dto: CancelAtPeriodEndDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<CancelAtPeriodEndResponse> =>
    apiClient
      .post<{ data: CancelAtPeriodEndResponse }>(
        `/super-admin/organisations/${organisationId}/billing/subscription/cancel-at-period-end`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  resume: (
    organisationId: string,
    dto: ResumeSubscriptionDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<ResumeSubscriptionResponse> =>
    apiClient
      .post<{ data: ResumeSubscriptionResponse }>(
        `/super-admin/organisations/${organisationId}/billing/subscription/resume`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  cancelImmediate: (
    organisationId: string,
    dto: CancelSubscriptionImmediateDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<CancelSubscriptionImmediateResponse> =>
    apiClient
      .delete<{ data: CancelSubscriptionImmediateResponse }>(
        `/super-admin/organisations/${organisationId}/billing/subscription`,
        {
          data: dto,
          headers: { 'Idempotency-Key': idempotencyKey },
        },
      )
      .then(d),
};
