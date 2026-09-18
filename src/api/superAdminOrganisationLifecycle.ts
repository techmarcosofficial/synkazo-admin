import apiClient from './apiClient';

import type {
  ClearPaymentHoldDto,
  HoldWorkDto,
  HoldWorkResponse,
  LifecycleTransitionResponse,
  PaymentHoldDto,
  ResumeWorkResponse,
  TransitionOrganisationStatusDto,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

// Lifecycle actions for a selected organisation. Every method targets a
// dedicated route (never a single generic "update" call) so the operator
// intent is auditable and the confirmation contract can vary per action
// — see the lifecycle-state-machine doc §Confirmation table.
export const superAdminOrganisationLifecycleApi = {
  transitionStatus: (
    organisationId: string,
    dto: TransitionOrganisationStatusDto,
  ): Promise<LifecycleTransitionResponse> =>
    apiClient
      .patch(`/super-admin/organisations/${organisationId}/status`, dto)
      .then(d),

  hold: (
    organisationId: string,
    dto: HoldWorkDto,
  ): Promise<HoldWorkResponse> =>
    apiClient
      .post(`/super-admin/organisations/${organisationId}/hold`, dto)
      .then(d),

  resume: (organisationId: string): Promise<ResumeWorkResponse> =>
    apiClient
      .post(`/super-admin/organisations/${organisationId}/resume`)
      .then(d),

  imposePaymentHold: (
    organisationId: string,
    dto: PaymentHoldDto,
  ): Promise<{ paymentHoldActive: true }> =>
    apiClient
      .post(
        `/super-admin/organisations/${organisationId}/payment-hold`,
        dto,
      )
      .then(d),

  clearPaymentHold: (
    organisationId: string,
    dto: ClearPaymentHoldDto,
  ): Promise<{ paymentHoldActive: false }> =>
    apiClient
      .delete(`/super-admin/organisations/${organisationId}/payment-hold`, {
        data: dto,
      })
      .then(d),
};
