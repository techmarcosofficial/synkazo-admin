import apiClient from './apiClient';

export interface BillingRecoverySettings {
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  gracePeriodDays: number;
  batchSize: number;
  failureAction: 'downgrade_to_free';
  notificationsEnabled: boolean;
}
export interface BillingRecoveryRun {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  checked: number;
  changed: number;
  downgraded: number;
  recovered: number;
  errors: { organisationId: string; message: string }[];
  cursor: string | null;
}
const path = '/super-admin/settings/billing-recovery';
export const billingRecoveryApi = {
  get: () =>
    apiClient
      .get<{ data: BillingRecoverySettings }>(path)
      .then((r) => r.data.data),
  status: () =>
    apiClient
      .get<{ data: BillingRecoveryRun | null }>(`${path}/status`)
      .then((r) => r.data.data),
  save: (
    value: BillingRecoverySettings & { reason: string; idempotencyKey: string },
  ) => {
    const { idempotencyKey, ...body } = value;
    return apiClient
      .put<{ data: BillingRecoverySettings }>(path, body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data.data);
  },
  run: ({
    reason,
    idempotencyKey,
  }: {
    reason: string;
    idempotencyKey: string;
  }) =>
    apiClient
      .post<{ data: BillingRecoveryRun }>(
        `${path}/run`,
        {
          reason,
          confirmed: true,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data.data),
};
