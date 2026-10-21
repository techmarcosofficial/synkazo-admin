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

// Ensure the Stripe.js Testing Assistant and test autofill tools appear above modal dialog overlays
if (typeof window !== 'undefined') {
  const elevateStripeWidgets = () => {
    try {
      const candidates = document.querySelectorAll<HTMLElement>(
        'iframe[src*="stripe"], iframe[name*="stripe"], iframe[name*="__privateStripe"], [class*="stripe-assistant"], [id*="stripe-assistant"], [class*="marvin"], [id*="marvin"], body > [style*="bottom"][style*="right"]',
      );
      candidates.forEach((el) => {
        if (
          el.closest('#root') &&
          !el.tagName.toLowerCase().includes('iframe')
        ) {
          return;
        }
        el.style.setProperty('z-index', '999999', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
        if (
          el.parentElement &&
          el.parentElement !== document.body &&
          el.parentElement !== document.documentElement
        ) {
          el.parentElement.style.setProperty('z-index', '999999', 'important');
          el.parentElement.style.setProperty(
            'pointer-events',
            'auto',
            'important',
          );
        }
      });
    } catch {
      // Safe guard against closed shadow roots or cross-origin access
    }
  };

  if (
    typeof MutationObserver !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    const observer = new MutationObserver(elevateStripeWidgets);
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class'],
          });
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', elevateStripeWidgets);
  window.addEventListener('load', elevateStripeWidgets);
}
