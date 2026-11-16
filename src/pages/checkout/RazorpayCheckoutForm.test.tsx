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
  loadCustom: vi.fn(),
  payCard: vi.fn(),
  openModal: vi.fn(),
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
vi.mock('@/lib/razorpay', () => ({
  loadRazorpayCustom: state.loadCustom,
  payWithCard: state.payCard,
  openRazorpayCheckout: state.openModal,
}));
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

// Fills the inline card form with valid test-card values (overridable per field).
function fillCard(overrides: Partial<Record<string, string>> = {}) {
  fireEvent.change(screen.getByPlaceholderText('Name on card'), {
    target: { value: overrides.name ?? 'Gaurav Kumar' },
  });
  fireEvent.change(screen.getByPlaceholderText('9123456780'), {
    target: { value: overrides.contact ?? '9123456780' },
  });
  fireEvent.change(screen.getByPlaceholderText('1234 1234 1234 1234'), {
    target: { value: overrides.number ?? '4111111111111111' },
  });
  fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
    target: { value: overrides.expiry ?? '1234' },
  });
  fireEvent.change(screen.getByPlaceholderText('123'), {
    target: { value: overrides.cvv ?? '123' },
  });
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
    amount: 2900,
    currency: 'usd',
  });
  state.loadCustom.mockResolvedValue(function FakeRazorpay() {});
  state.refresh.mockResolvedValue({
    planId: 'plan-1',
    subscriptionStatus: 'active',
    paymentHoldActive: false,
  });
});

describe('RazorpayCheckoutForm', () => {
  it('collects the card inline, hands it to Razorpay, verifies, then confirms access', async () => {
    state.payCard.mockResolvedValue(response);
    const onSuccess = vi.fn();
    renderWithClient(
      <RazorpayCheckoutForm
        plan={plan}
        price={price}
        onSuccess={onSuccess}
        couponCode="SAVE10"
      />,
    );
    await screen.findByPlaceholderText('Name on card');
    fillCard();
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await screen.findByText('Subscription purchased successfully.');
    expect(state.checkout).toHaveBeenCalledWith({
      priceId: 'price-1',
      couponCode: 'SAVE10',
    });
    expect(state.payCard).toHaveBeenCalledWith(
      expect.any(Function),
      'rzp_test_k',
      expect.objectContaining({
        subscriptionId: 'sub_1',
        amount: 2900,
        currency: 'usd',
        contact: '9123456780',
        card: expect.objectContaining({ number: '4111111111111111' }),
      }),
    );
    expect(state.verify).toHaveBeenCalledWith(response);
  });

  it('blocks submit when the card number is invalid', async () => {
    renderWithClient(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    await screen.findByPlaceholderText('Name on card');
    fillCard({ number: '1234' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await waitFor(() =>
      expect(state.toastError).toHaveBeenCalledWith(
        expect.stringContaining('valid card number'),
      ),
    );
    expect(state.payCard).not.toHaveBeenCalled();
  });

  it('shows a toast when Razorpay rejects the payment', async () => {
    state.payCard.mockRejectedValue(new Error('Your card was declined.'));
    renderWithClient(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    await screen.findByPlaceholderText('Name on card');
    fillCard();
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to Starter' }),
    );
    await waitFor(() =>
      expect(state.toastError).toHaveBeenCalledWith('Your card was declined.'),
    );
    expect(
      screen.queryByText('Subscription purchased successfully.'),
    ).not.toBeInTheDocument();
  });

  it('drops a promo code the server rejects while starting checkout', async () => {
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
    renderWithClient(
      <RazorpayCheckoutForm
        plan={plan}
        price={price}
        onSuccess={vi.fn()}
        couponCode="OLD"
        onCouponRejected={onCouponRejected}
      />,
    );
    await waitFor(() => expect(onCouponRejected).toHaveBeenCalled());
    expect(state.payCard).not.toHaveBeenCalled();
  });

  it('does not report success while access is still pending', async () => {
    state.payCard.mockResolvedValue(response);
    state.refresh.mockResolvedValue({
      planId: 'free',
      subscriptionStatus: 'incomplete',
      paymentHoldActive: false,
    });
    renderWithClient(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    await screen.findByPlaceholderText('Name on card');
    fillCard();
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

  it('falls back to the Razorpay modal on request', async () => {
    state.openModal.mockResolvedValue(response);
    renderWithClient(
      <RazorpayCheckoutForm plan={plan} price={price} onSuccess={vi.fn()} />,
    );
    await screen.findByPlaceholderText('Name on card');
    fireEvent.click(
      screen.getByRole('button', { name: /Pay in a Razorpay window instead/ }),
    );
    await waitFor(() => expect(state.openModal).toHaveBeenCalled());
    expect(state.openModal).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rzp_test_k',
        subscription_id: 'sub_1',
        prefill: { name: 'Acme', email: 'buyer@example.com' },
      }),
      expect.any(Function),
    );
    expect(state.verify).toHaveBeenCalledWith(response);
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
