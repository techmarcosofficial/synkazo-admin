import type { RazorpayCheckoutResponse } from '@/types';

// ── Custom Checkout (inline card form on our own page) ──────────────────────────
//
// Unlike the modal (Checkout.js above), Custom Checkout (razorpay.js) lets us render the card
// fields ourselves and submit them straight to Razorpay via `createPayment` — the card data
// never touches our servers. Razorpay still opens a small bank OTP/3-D Secure popup for the
// RBI-mandated authentication step; that window cannot be removed.

/** Card details collected by our inline form, before hand-off to Razorpay. */
export interface RazorpayCardInput {
  name: string;
  number: string; // digits only (spaces already stripped)
  expiryMonth: string; // "MM"
  expiryYear: string; // "YY"
  cvv: string;
}

export interface RazorpayCustomPayment {
  subscriptionId: string;
  amount: number;
  currency: string;
  email: string;
  contact: string;
  card: RazorpayCardInput;
}

interface RazorpayCustomInstance {
  createPayment(data: Record<string, unknown>): void;
  on(
    event: 'payment.success',
    cb: (res: RazorpayCheckoutResponse) => void,
  ): void;
  on(
    event: 'payment.error',
    cb: (res: { error?: { description?: string } }) => void,
  ): void;
}
type RazorpayCustomConstructor = new (options: {
  key: string;
}) => RazorpayCustomInstance;

const CUSTOM_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/razorpay.js';
let customLoading: Promise<RazorpayCustomConstructor> | null = null;

/** Loads razorpay.js (Custom Checkout) once, on first use. */
export function loadRazorpayCustom(): Promise<RazorpayCustomConstructor> {
  const existing = (window as { Razorpay?: RazorpayCustomConstructor })
    .Razorpay;
  // Checkout.js and razorpay.js both expose `window.Razorpay`; a constructor loaded by either
  // supports `createPayment` only when razorpay.js is the one present. We key off our own
  // load promise rather than the global to avoid grabbing the modal-only build.
  if (customLoading) return customLoading;
  if (existing && 'prototype' in existing) {
    // Already on the page from a prior load in this tab.
    return Promise.resolve(existing);
  }
  customLoading = new Promise<RazorpayCustomConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CUSTOM_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = (window as { Razorpay?: RazorpayCustomConstructor })
        .Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error('Razorpay Checkout failed to load.'));
    };
    script.onerror = () => {
      customLoading = null;
      reject(new Error('Razorpay Checkout failed to load.'));
    };
    document.body.appendChild(script);
  });
  return customLoading;
}

/**
 * Submits card details for a Razorpay subscription through Custom Checkout. Must be called
 * synchronously inside the user's click (Razorpay opens the bank-auth popup, which browsers
 * block otherwise). Resolves with the signed result on success; rejects with a human-readable
 * message on failure. The subscription must already exist — create it before the click.
 */
export function payWithCard(
  Razorpay: RazorpayCustomConstructor,
  keyId: string,
  payment: RazorpayCustomPayment,
): Promise<RazorpayCheckoutResponse> {
  return new Promise((resolve, reject) => {
    const instance = new Razorpay({ key: keyId });
    instance.on('payment.success', (res) => resolve(res));
    instance.on('payment.error', (res) =>
      reject(new Error(res.error?.description ?? 'The payment failed.')),
    );
    instance.createPayment({
      // Razorpay authoritatively charges per the subscription; amount/currency are required
      // by Custom Checkout but reconciled against the subscription's own schedule. The currency
      // MUST be an uppercase ISO code ("USD", "INR") — Razorpay rejects a lowercase code as
      // "currency not supported", so normalise it here (we store it lowercase, Stripe-style).
      amount: payment.amount,
      currency: payment.currency.toUpperCase(),
      email: payment.email,
      contact: payment.contact,
      subscription_id: payment.subscriptionId,
      recurring: 1,
      method: 'card',
      'card[name]': payment.card.name,
      'card[number]': payment.card.number,
      'card[cvv]': payment.card.cvv,
      'card[expiry_month]': payment.card.expiryMonth,
      'card[expiry_year]': payment.card.expiryYear,
    });
  });
}

/** The subset of Razorpay Checkout.js options this app uses. */
export interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  /** Opens Checkout to replace the card on an existing subscription instead of paying. */
  subscription_card_change?: boolean;
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
