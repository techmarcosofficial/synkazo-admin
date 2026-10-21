import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PaymentHistoryTab from './PaymentHistoryTab';

const state = vi.hoisted(() => ({
  query: vi.fn(),
  data: {
    items: [
      {
        id: 'result-1',
        paymentId: 'pi-1',
        eventType: 'payment_succeeded',
        createdAt: '2026-10-14T10:00:00Z',
        amount: 1000,
        currency: 'usd',
        orderStatus: 'paid',
        description: null,
      },
    ],
    total: 51,
  },
}));
vi.mock('@/queries/useBilling', () => ({
  usePaymentHistoryQuery: (page: number, limit: number) => {
    state.query(page, limit);
    return {
      data: state.data,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));
afterEach(cleanup);
describe('Payment history result display', () => {
  it('shows one final outcome and requests the next canonical result page', () => {
    render(<PaymentHistoryTab />);
    expect(screen.getAllByText('Payment succeeded')).toHaveLength(1);
    expect(screen.queryByText('Invoice paid')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment failed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(state.query).toHaveBeenLastCalledWith(2, 50);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });
});
