import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BillingGuidedTour, {
  type BillingTourSection,
} from '@/components/billing/BillingGuidedTour';
import { useGuideStore } from '@/features/guide';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { useRefreshPlanMutation } from '@/queries/useBilling';

// Per user: a browser-wide flag meant the first person to finish the tour hid
// it from every later signup in the same browser.
const tourDoneKey = (userId: string) => `sb_billing_tour_done:${userId}`;

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // Storage blocked: the tour may show again on a later first checkout.
  }
}

/**
 * Wraps the billing workspace with Stripe checkout-return handling.
 *
 * Silently syncs the plan from Stripe upon returning from checkout and
 * redirects if a safe destination was provided. Restores onboarding tour
 * on first checkout return.
 */
export default function BillingSectionShell({
  children,
}: {
  children: ReactNode;
}) {
  const { currentUser } = useSynkazoAuth();
  const userId = currentUser?.id ?? null;
  const refreshPlan = useRefreshPlanMutation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledCheckoutReturn = useRef(false);
  const [showTour, setShowTour] = useState(false);
  const setGuidePaused = useGuideStore((s) => s.setPaused);

  // The setup guide waits behind the billing tour, then picks up straight
  // after it (done or skipped) by pointing at Projects.
  useEffect(() => {
    setGuidePaused(showTour);
    return () => setGuidePaused(false);
  }, [showTour, setGuidePaused]);

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

      if (
        searchParams.get('first_checkout') === 'true' &&
        userId &&
        !readFlag(tourDoneKey(userId))
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
  }, [searchParams, navigate, refreshPlan, setSearchParams, userId]);

  // The tour opens each billing section it describes (?section=...).
  const showSection = (section: BillingTourSection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        if (section === 'overview') next.delete('section');
        else next.set('section', section);
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true },
    );
  };

  return (
    <>
      {children}
      <BillingGuidedTour
        active={showTour}
        onSection={showSection}
        onDone={() => {
          setShowTour(false);
          if (userId) writeFlag(tourDoneKey(userId));
          showSection('overview');
        }}
      />
    </>
  );
}
