import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BillingRecoveryCard from './BillingRecoveryCard';

const state = vi.hoisted(() => ({
  confirm: vi.fn(),
  save: vi.fn(),
  run: vi.fn(),
  error: false,
}));
vi.mock('@/stores/useConfirmDialogStore', () => ({
  useConfirmDialogStore: (
    select: (store: { confirm: typeof state.confirm }) => unknown,
  ) => select({ confirm: state.confirm }),
}));
vi.mock('@/queries/useBillingRecovery', () => ({
  useBillingRecoverySettingsQuery: () => ({
    isError: state.error,
    isLoading: false,
    refetch: vi.fn(),
    data: {
      enabled: true,
      cronExpression: '0 0 * * * *',
      timezone: 'UTC',
      gracePeriodDays: 8,
      batchSize: 100,
      failureAction: 'downgrade_to_free',
      notificationsEnabled: true,
    },
  }),
  useBillingRecoveryStatusQuery: () => ({
    isLoading: false,
    isError: false,
    data: null,
  }),
  useSaveBillingRecoveryMutation: () => ({
    mutateAsync: state.save,
    isPending: false,
    isError: false,
  }),
  useRunBillingRecoveryMutation: () => ({
    mutateAsync: state.run,
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/lib/toast', () => ({ showToast: { success: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.error = false;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
describe('Billing recovery settings', () => {
  it('requires reason and confirmation before applying zero grace', async () => {
    render(<BillingRecoveryCard />);
    fireEvent.change(screen.getByLabelText('Renewal failure grace (days)'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await screen.findByText('Enter at least 10 characters.');
    expect(state.confirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Reason for this action'), {
      target: { value: 'Immediate renewal protection' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.save).not.toHaveBeenCalled();
    await state.confirm.mock.calls[0][0].onConfirm();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        gracePeriodDays: 0,
        reason: 'Immediate renewal protection',
      }),
    );
  });
  it('requires confirmation before running a billing check', async () => {
    render(<BillingRecoveryCard />);
    fireEvent.change(screen.getByLabelText('Reason for this action'), {
      target: { value: 'Check missed payment events' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run now' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.run).not.toHaveBeenCalled();
    await state.confirm.mock.calls[0][0].onConfirm();
    expect(state.run).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Check missed payment events',
        idempotencyKey: expect.any(String),
      }),
    );
  });
  it('shows a recovery action if settings cannot load', () => {
    state.error = true;
    render(<BillingRecoveryCard />);
    expect(
      screen.getByRole('button', { name: /retry|try again/i }),
    ).toBeInTheDocument();
  });
});
