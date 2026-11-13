import type { RazorpayCheckoutResponse } from '@/types';

/** The subset of Razorpay Checkout.js options this app uses. */
export interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open(): void;
  on(
    event: 'payment.failed',
    cb: (res: { error: { description?: string } }) => void,
  ): void;
}
type RazorpayConstructor = new (
  options: RazorpayCheckoutOptions,
) => RazorpayInstance;

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<RazorpayConstructor> | null = null;

/** Loads Razorpay Checkout.js once, on first use (not on every page). */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  const existing = (window as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = (window as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error('Razorpay Checkout failed to load.'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Razorpay Checkout failed to load.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Opens the Razorpay modal for a subscription. Resolves with the handler response, or null if
 * the customer closes the modal. Failed attempts stay in the modal (Razorpay lets them retry);
 * each failure is reported through `onFailure`.
 */
export async function openRazorpayCheckout(
  options: Omit<RazorpayCheckoutOptions, 'handler' | 'modal'>,
  onFailure: (message: string) => void,
): Promise<RazorpayCheckoutResponse | null> {
  const Razorpay = await loadRazorpayCheckout();
  return new Promise((resolve) => {
    const instance = new Razorpay({
      ...options,
      handler: resolve,
      modal: { ondismiss: () => resolve(null) },
    });
    instance.on('payment.failed', (res) =>
      onFailure(res.error.description ?? 'The payment failed.'),
    );
    instance.open();
  });
}
