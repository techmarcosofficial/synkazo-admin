import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RazorpayChangePlanForm,
  RazorpayCheckoutForm,
} from './RazorpayCheckoutForm';
import type { ApiPlan, ApiPrice } from '@/types';

const state = vi.hoisted(() => ({
  checkout: vi.fn(),
  verify: vi.fn(),
  preview: vi.fn(),
  open: vi.fn(),
  refresh: vi.fn(),
  upgrade: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('@/api/billing', () => ({
  billingApi: {
    razorpayCheckout: state.checkout,
    razorpayVerify: state.verify,
    previewRazorpayPlanChange: state.preview,
  },
}));
vi.mock('@/lib/razorpay', () => ({ openRazorpayCheckout: state.open }));
vi.mock('@/lib/toast', () => ({
  showToast: { error: state.toastError, success: vi.fn() },
}));
vi.mock('@/queries/useBilling', () => ({
  useRefreshPlanMutation: () => ({ mutateAsync: state.refresh }),
  useUpgradeMutation: () => ({ mutate: state.upgrade, isPending: false }),
}));

const plan = { id: 'plan-1', name: 'Starter' } as ApiPlan;
const price = {
  id: 'price-1',
  amount: 2900,
  currency: 'usd',
  billingInterval: 'month',
} as ApiPrice;
const response = {
  razorpay_payment_id: 'pay_1',
  razorpay_subscription_id: 'sub_1',
  razorpay_signature: 'sig',
};

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.checkout.mockResolvedValue({
    gateway: 'razorpay',
    subscriptionId: 'sub_1',
    keyId: 'rzp_test_k',
    name: 'Acme',
    email: 'buyer@example.com',
    description: 'Starter (monthly)',
    trialDays: 0,
  });
  state.refresh.mockResolvedValue({
    planId: 'plan-1',
    subscriptionStatus: 'active',
    paymentHoldActive: false,
  });
});

describe('RazorpayCheckoutForm', () => {
  it('opens Razorpay, verifies the signed result, then confirms access', async () => {
    state.open.mockResolvedValue(response);
    const onSuccess = vi.fn();
    render(
      <RazorpayCheckoutForm
        plan={plan}
        price={price}
        onSuccess={onSuccess}
        couponCode="SAVE10"
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await screen.findByText('Subscription purchased successfully.');
    expect(state.checkout).toHaveBeenCalledWith({
      priceId: 'price-1',
      couponCode: 'SAVE10',
    });
    expect(state.open).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rzp_test_k',
        subscription_id: 'sub_1',
        prefill: { name: 'Acme', email: 'buyer@example.com' },
      }),
      expect.any(Function),
    );
    expect(state.verify).toHaveBeenCalledWith(response);
  });

  it('does nothing when the customer closes the Razorpay window', async () => {
    state.open.mockResolvedValue(null);
    render(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await waitFor(() => expect(state.open).toHaveBeenCalled());
    expect(state.verify).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    ).not.toBeDisabled();
  });

  it('drops a promo code the server no longer accepts', async () => {
    state.checkout.mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: 'COUPON_INVALID',
          message: 'That promo code is no longer valid.',
        },
      },
    });
    const onCouponRejected = vi.fn();
    render(
      <RazorpayCheckoutForm
        plan={plan}
        price={price}
        onSuccess={vi.fn()}
        couponCode="OLD"
        onCouponRejected={onCouponRejected}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await waitFor(() => expect(onCouponRejected).toHaveBeenCalled());
    expect(state.open).not.toHaveBeenCalled();
  });

  it('does not report success while access is still pending', async () => {
    state.open.mockResolvedValue(response);
    state.refresh.mockResolvedValue({
      planId: 'free',
      subscriptionStatus: 'incomplete',
      paymentHoldActive: false,
    });
    render(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await waitFor(() =>
      expect(state.toastError).toHaveBeenCalledWith(
        expect.stringContaining('Payment confirmation is still pending'),
      ),
    );
    expect(
      screen.queryByText('Subscription purchased successfully.'),
    ).not.toBeInTheDocument();
  });
});

describe('RazorpayChangePlanForm', () => {
  it('shows the cycle-end schedule with nothing due today, then schedules it', async () => {
    state.preview.mockResolvedValue({
      gateway: 'razorpay',
      currentPlanName: 'Starter',
      newPlanName: 'Pro',
      effectiveAt: '2026-12-12T00:00:00.000Z',
      amountDueNow: 0,
      newAmount: 9900,
      currency: 'usd',
      billingInterval: 'month',
    });
    renderWithClient(
      <RazorpayChangePlanForm price={price} onSuccess={vi.fn()} />,
    );
    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$99 / month')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Schedule plan change' }),
    );
    expect(state.upgrade).toHaveBeenCalledWith(
      { priceId: 'price-1' },
      expect.any(Object),
    );
  });
});
