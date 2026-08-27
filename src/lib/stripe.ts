import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Lazily-loaded Stripe.js singleton for Elements. The publishable key is safe to expose
 * in the browser. Returns null if the key isn't configured so the checkout page can show a
 * clear "billing not configured" message instead of throwing.
 */
const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null);

export const isStripeConfigured = Boolean(key);
