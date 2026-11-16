import { describe, expect, it, vi } from 'vitest';
import { payWithCard } from './razorpay';

describe('payWithCard', () => {
  it('sends an uppercase currency to Razorpay (lowercase is rejected as unsupported)', async () => {
    const createPayment = vi.fn();
    const keys: Array<{ key: string }> = [];
    let onSuccess: ((res: unknown) => void) | undefined;
    class FakeRazorpay {
      constructor(opts: { key: string }) {
        keys.push(opts);
      }
      createPayment = createPayment;
      on(event: string, cb: (res: unknown) => void) {
        if (event === 'payment.success') onSuccess = cb;
      }
    }

    const response = {
      razorpay_payment_id: 'pay_1',
      razorpay_subscription_id: 'sub_1',
      razorpay_signature: 'sig',
    };
    const promise = payWithCard(FakeRazorpay as never, 'rzp_test_k', {
      subscriptionId: 'sub_1',
      amount: 2900,
      currency: 'usd',
      email: 'buyer@example.com',
      contact: '9123456780',
      card: {
        name: 'Gaurav Kumar',
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '34',
        cvv: '123',
      },
    });

    expect(keys).toEqual([{ key: 'rzp_test_k' }]);
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        amount: 2900,
        subscription_id: 'sub_1',
        recurring: 1,
        method: 'card',
        'card[number]': '4111111111111111',
      }),
    );

    onSuccess?.(response);
    await expect(promise).resolves.toEqual(response);
  });

  it('rejects with the Razorpay error description on failure', async () => {
    let onError: ((res: unknown) => void) | undefined;
    class FakeRazorpay {
      createPayment = vi.fn();
      on(event: string, cb: (res: unknown) => void) {
        if (event === 'payment.error') onError = cb;
      }
    }

    const promise = payWithCard(FakeRazorpay as never, 'rzp_test_k', {
      subscriptionId: 'sub_1',
      amount: 2900,
      currency: 'usd',
      email: 'buyer@example.com',
      contact: '9123456780',
      card: {
        name: 'Gaurav Kumar',
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '34',
        cvv: '123',
      },
    });

    onError?.({ error: { description: 'Your card was declined.' } });
    await expect(promise).rejects.toThrow('Your card was declined.');
  });
});
