import { beforeEach, describe, expect, it, vi } from 'vitest';
import { billingRecoveryApi } from './billingRecovery';
import { superAdminBillingApi } from './superAdminBilling';
const http = vi.hoisted(() => ({
  put: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('./apiClient', () => ({ default: http }));
beforeEach(() => {
  vi.clearAllMocks();
  http.put.mockResolvedValue({ data: { data: {} } });
  http.post.mockResolvedValue({ data: { data: {} } });
  http.patch.mockResolvedValue({ data: { data: {} } });
});
describe('Billing mutation HTTP contracts', () => {
  it('sends the required idempotency header and omits it from the validated policy body', async () => {
    const value = {
      enabled: true,
      cronExpression: '0 0 * * * *',
      timezone: 'UTC',
      gracePeriodDays: 0,
      batchSize: 100,
      failureAction: 'downgrade_to_free' as const,
      notificationsEnabled: true,
      reason: 'Immediate renewal protection',
    };
    await billingRecoveryApi.save({ ...value, idempotencyKey: 'intent-1' });
    expect(http.put).toHaveBeenCalledWith(
      '/super-admin/settings/billing-recovery',
      value,
      { headers: { 'Idempotency-Key': 'intent-1' } },
    );
  });
  it('sends confirmation, reason and a stable manual-run key', async () => {
    await billingRecoveryApi.run({
      reason: 'Verify missed webhooks',
      idempotencyKey: 'intent-2',
    });
    expect(http.post).toHaveBeenCalledWith(
      '/super-admin/settings/billing-recovery/run',
      { reason: 'Verify missed webhooks', confirmed: true },
      { headers: { 'Idempotency-Key': 'intent-2' } },
    );
  });
  it('preserves reason and idempotency when assigning a complimentary plan', async () => {
    await superAdminBillingApi.assignPlan(
      'org-1',
      'plan-1',
      'Complimentary customer plan',
      'intent-3',
    );
    expect(http.patch).toHaveBeenCalledWith(
      '/super-admin/organisations/org-1/billing/plan',
      { planId: 'plan-1', reason: 'Complimentary customer plan' },
      { headers: { 'Idempotency-Key': 'intent-3' } },
    );
  });
});
