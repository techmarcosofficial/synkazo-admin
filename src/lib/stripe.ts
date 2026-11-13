import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { usePublicPaymentConfigQuery } from '@/queries/usePaymentGateways';

/**
 * Stripe.js for Elements. The publishable key comes from `GET /billing/public-config` (Super
 * Admin settings, falling back to the API's .env), so changing it needs no frontend rebuild.
 * VITE_STRIPE_PUBLISHABLE_KEY is only used if that request fails.
 */
const buildTimeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  string | undefined;
const clients = new Map<string, Promise<Stripe | null>>();
const NOT_CONFIGURED: Promise<Stripe | null> = Promise.resolve(null);

export function useStripeClient(): {
  stripePromise: Promise<Stripe | null>;
  isStripeConfigured: boolean;
  isLoading: boolean;
} {
  const config = usePublicPaymentConfigQuery();
  const key = config.data
    ? config.data.stripePublishableKey
    : config.isError
      ? (buildTimeKey ?? null)
      : null;
  if (!key)
    return {
      stripePromise: NOT_CONFIGURED,
      isStripeConfigured: false,
      isLoading: config.isLoading,
    };
  if (!clients.has(key)) clients.set(key, loadStripe(key));
  return {
    stripePromise: clients.get(key)!,
    isStripeConfigured: true,
    isLoading: false,
  };
}

// Ensure the Stripe.js Testing Assistant and test autofill tools appear above modal dialog overlays
if (typeof window !== 'undefined') {
  const elevateStripeWidgets = () => {
    try {
      const candidates = document.querySelectorAll<HTMLElement>(
        '[class*="stripe-assistant"], [id*="stripe-assistant"], [class*="marvin"], [id*="marvin"], body > iframe[src*="test-assistant"], body > [style*="bottom"][style*="right"]',
      );
      candidates.forEach((el) => {
        // Never elevate normal Elements iframes inside the application root
        if (el.closest('#root')) {
          return;
        }
        el.style.setProperty('z-index', '999999', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
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
