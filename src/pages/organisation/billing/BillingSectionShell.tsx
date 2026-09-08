import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BillingGuidedTour from '@/components/billing/BillingGuidedTour';
import { showToast } from '@/lib/toast';
import { useRefreshPlanMutation } from '@/queries/useBilling';

const TOUR_DONE_KEY = 'sb_billing_tour_done';

/**
 * Wraps the billing sub-tabs with the two concerns that must outlive them.
 *
 * The Stripe checkout-return handshake and the guided tour used to live in the
 * component that rendered all six tabs. Now each sub-tab is its own route, so
 * anything owned by a tab would re-run (or stop running) as the user moves
 * between them — this sits one level up instead, where it fires once per
 * arrival regardless of which sub-tab the URL landed on.
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
  const [showTour, setShowTour] = useState(false);

  // Returning from Stripe Checkout: pull fresh state straight from Stripe (don't
  // depend on the webhook having landed), then greet the user.
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout || handledCheckoutReturn.current) return;
    handledCheckoutReturn.current = true;

    if (checkout === 'success') {
      // The checkout page already showed "Subscription purchased successfully"
      // before redirecting here — silently sync the plan, no second toast.
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

      // CheckoutPage only adds this for a brand-new signup, never a plan change,
      // so it's a reliable "first time" signal — but still gate on localStorage
      // in case the user bookmarks/revisits this URL.
      if (
        searchParams.get('first_checkout') === 'true' &&
        !localStorage.getItem(TOUR_DONE_KEY)
      ) {
        setShowTour(true);
      } else if (safeRedirect) {
        navigate(safeRedirect, { replace: true });
      }
    } else if (checkout === 'cancelled') {
      showToast.info('Checkout cancelled — your plan is unchanged.');
    }

    searchParams.delete('checkout');
    searchParams.delete('first_checkout');
    searchParams.delete('redirect');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams]);

  return (
    <>
      {children}
      <BillingGuidedTour
        active={showTour}
        onDone={() => {
          setShowTour(false);
          localStorage.setItem(TOUR_DONE_KEY, 'true');
        }}
      />
    </>
  );
}
