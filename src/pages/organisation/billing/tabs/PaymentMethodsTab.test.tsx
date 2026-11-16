import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PaymentMethodsTab from './PaymentMethodsTab';

const mocks = vi.hoisted(() => ({
  cards: [] as unknown[],
  cardChange: vi.fn(),
  cardChangeVerify: vi.fn(),
  openCheckout: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/queries/useBilling', () => ({
  useSubscriptionQuery: () => ({ data: { gateway: 'razorpay' } }),
  usePaymentMethodsQuery: () => ({
    data: mocks.cards,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/stripe', () => ({
  useStripeClient: () => ({ isStripeConfigured: true }),
}));
vi.mock('@/lib/razorpay', () => ({ openRazorpayCheckout: mocks.openCheckout }));
vi.mock('@/lib/toast', () => ({ showToast: mocks.toast }));
vi.mock('@/api/billing', () => ({
  billingApi: {
    razorpayCardChange: mocks.cardChange,
    razorpayCardChangeVerify: mocks.cardChangeVerify,
  },
}));

const renderTab = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentMethodsTab />
    </QueryClientProvider>,
  );

const RESPONSE = {
  razorpay_payment_id: 'pay_1',
  razorpay_subscription_id: 'sub_1',
  razorpay_signature: 'a'.repeat(64),
};

describe('PaymentMethodsTab (Razorpay)', () => {
  beforeEach(() => {
    mocks.cards = [
      {
        id: 'token_1',
        cardBrand: 'mastercard',
        cardLast4: '5558',
        cardExpMonth: 1,
        cardExpYear: 2099,
        isDefault: true,
      },
    ];
    mocks.cardChange.mockResolvedValue({
      subscriptionId: 'sub_1',
      keyId: 'rzp_test_k',
      name: 'Acme',
      email: 'a@b.c',
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the card Razorpay charges, with last 4, expiry and Default — no Stripe Add card', () => {
    renderTab();
    expect(screen.getByText('mastercard •••• 5558')).toBeInTheDocument();
    expect(screen.getByText('Expires 01 / 2099')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Add card/ }),
    ).not.toBeInTheDocument();
  });

  it('Change card opens Razorpay card change, verifies, and confirms', async () => {
    mocks.openCheckout.mockResolvedValue(RESPONSE);
    mocks.cardChangeVerify.mockResolvedValue(mocks.cards);
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /Change card/ }));
    await waitFor(() =>
      expect(mocks.cardChangeVerify).toHaveBeenCalledWith(RESPONSE),
    );
    expect(mocks.openCheckout.mock.calls[0][0]).toMatchObject({
      key: 'rzp_test_k',
      subscription_id: 'sub_1',
      subscription_card_change: true,
    });
    expect(mocks.toast.success).toHaveBeenCalledWith(
      'Card updated. Future payments use the new card.',
    );
  });

  it('closing the Razorpay window keeps the current card and verifies nothing', async () => {
    mocks.openCheckout.mockResolvedValue(null);
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /Change card/ }));
    await waitFor(() => expect(mocks.openCheckout).toHaveBeenCalled());
    expect(mocks.cardChangeVerify).not.toHaveBeenCalled();
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });

  it('shows the server reason when the card change cannot start', async () => {
    mocks.cardChange.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: 'The card can only be changed on a live subscription.',
        },
      },
    });
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /Change card/ }));
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'The card can only be changed on a live subscription.',
      ),
    );
  });

  it('offers to add a card when none is linked yet', () => {
    mocks.cards = [];
    renderTab();
    expect(screen.getByText('No card linked yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add a card/ }),
    ).toBeInTheDocument();
  });
});
