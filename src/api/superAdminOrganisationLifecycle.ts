import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import { createIdempotencyKey } from '@/lib/idempotency';

import type {
  ClearPaymentHoldDto,
  HoldWorkDto,
  HoldWorkResponse,
  LifecycleTransitionResponse,
  PaymentHoldDto,
  ResumeWorkResponse,
  TransitionOrganisationStatusDto,
} from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

// Lifecycle actions for a selected organisation. Every method targets a
// dedicated route (never a single generic "update" call) so the operator
// intent is auditable and the confirmation contract can vary per action
// — see the lifecycle-state-machine doc §Confirmation table.
export const superAdminOrganisationLifecycleApi = {
  transitionStatus: (
    organisationId: string,
    dto: TransitionOrganisationStatusDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<LifecycleTransitionResponse> =>
    apiClient
      .patch<{ data: LifecycleTransitionResponse }>(
        `/super-admin/organisations/${organisationId}/status`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  hold: (
    organisationId: string,
    dto: HoldWorkDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<HoldWorkResponse> =>
    apiClient
      .post<{ data: HoldWorkResponse }>(
        `/super-admin/organisations/${organisationId}/hold`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  resume: (
    organisationId: string,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<ResumeWorkResponse> =>
    apiClient
      .post<{ data: ResumeWorkResponse }>(
        `/super-admin/organisations/${organisationId}/resume`,
        {},
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  imposePaymentHold: (
    organisationId: string,
    dto: PaymentHoldDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<{ paymentHoldActive: true }> =>
    apiClient
      .post<{ data: { paymentHoldActive: true } }>(
        `/super-admin/organisations/${organisationId}/payment-hold`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),

  clearPaymentHold: (
    organisationId: string,
    dto: ClearPaymentHoldDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<{ paymentHoldActive: false }> =>
    apiClient
      .delete<{ data: { paymentHoldActive: false } }>(
        `/super-admin/organisations/${organisationId}/payment-hold`,
        {
          data: dto,
          headers: { 'Idempotency-Key': idempotencyKey },
        },
      )
      .then(d),
};
