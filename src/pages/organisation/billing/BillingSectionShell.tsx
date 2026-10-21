import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { showToast } from '@/lib/toast';
import { useRefreshPlanMutation } from '@/queries/useBilling';

/**
 * Wraps the billing workspace with Stripe checkout-return handling.
 *
 * Silently syncs the plan from Stripe upon returning from checkout and
 * redirects if a safe destination was provided.
 */
export default function BillingSectionShell({
  children,
}: {
  children: ReactNode;
}) {
  const refreshPlan = useRefreshPlanMutation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledCheckoutReturn = useRef(false);

  // Returning from Stripe Checkout: pull fresh state straight from Stripe (don't
  // depend on the webhook having landed), then greet the user.
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout || handledCheckoutReturn.current) return;
    handledCheckoutReturn.current = true;

    if (checkout === 'success') {
      refreshPlan
        .mutateAsync()
        .catch(() =>
          showToast.error(
            "We couldn't confirm your subscription yet. Refresh in a moment.",
          ),
        );

      // Same-origin guard, mirroring CheckoutPage's — this value round-trips
      // through a URL the user could otherwise edit.
      const redirectParam = searchParams.get('redirect');
      const safeRedirect =
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//')
          ? redirectParam
          : null;

      if (safeRedirect) {
        navigate(safeRedirect, { replace: true });
      }
    } else if (checkout === 'cancelled') {
      showToast.info('Checkout cancelled — your plan is unchanged.');
    }

    searchParams.delete('checkout');
    searchParams.delete('first_checkout');
    searchParams.delete('redirect');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, navigate, refreshPlan, setSearchParams]);

  return <>{children}</>;
}
