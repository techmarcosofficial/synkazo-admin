import apiClient from './apiClient';

import type {
  CancelAtPeriodEndDto,
  CancelAtPeriodEndResponse,
  CancelSubscriptionImmediateDto,
  CancelSubscriptionImmediateResponse,
  ResumeSubscriptionDto,
  ResumeSubscriptionResponse,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

// SA-703/704 subscription lifecycle commands. One method per intent —
// the doc bans consolidating cancel-at-period-end / immediate cancel /
// resume behind a single generic command, and the API is shaped so we
// can't accidentally do it here either (different DTOs, different
// paths, different response types).
export const superAdminSubscriptionApi = {
  cancelAtPeriodEnd: (
    organisationId: string,
    dto: CancelAtPeriodEndDto,
  ): Promise<CancelAtPeriodEndResponse> =>
    apiClient
      .post(
        `/super-admin/organisations/${organisationId}/billing/subscription/cancel-at-period-end`,
        dto,
      )
      .then(d),

  resume: (
    organisationId: string,
    dto: ResumeSubscriptionDto,
  ): Promise<ResumeSubscriptionResponse> =>
    apiClient
      .post(
        `/super-admin/organisations/${organisationId}/billing/subscription/resume`,
        dto,
      )
      .then(d),

  cancelImmediate: (
    organisationId: string,
    dto: CancelSubscriptionImmediateDto,
  ): Promise<CancelSubscriptionImmediateResponse> =>
    apiClient
      .delete(
        `/super-admin/organisations/${organisationId}/billing/subscription`,
        { data: dto },
      )
      .then(d),
};
