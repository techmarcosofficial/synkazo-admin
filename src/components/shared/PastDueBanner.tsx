import { Link } from 'react-router-dom';

import PageContextAlert from '@/components/shared/PageContextAlert';
import { usePlanQuery } from '@/queries/useBilling';

// Subscription state where the latest invoice failed but Stripe is still retrying — keeps
// dashboard access, so this banner is the nudge to act rather than a lockout. `unpaid` (retries
// exhausted) is no longer handled here — AppLayout's paywall blocks the dashboard entirely once
// a subscription reaches that state (see decision #6).
const BLOCKING_STATUSES = new Set(['past_due']);

function formatDate(iso: string | null): string {
  if (!iso) return 'the end of your billing period';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Dashboard-wide alert shown when the org's subscription payment has failed (Stripe still
 * retrying), or when a cancel-at-period-end is pending. Both keep dashboard access, so this
 * banner is the nudge to act rather than a lockout.
 */
export default function PastDueBanner() {
  const { data } = usePlanQuery();
  if (!data) return null;

  const status = data.subscriptionStatus as string;
  const pendingCancel = status === 'pending_cancel' || data.cancelAtPeriodEnd;
  if (!BLOCKING_STATUSES.has(status) && !pendingCancel) return null;

  if (pendingCancel) {
    return (
      <PageContextAlert
        variant="warning"
        title={`Your ${data.planName} subscription is scheduled to cancel`}
        description={
          <>
            You'll keep access until {formatDate(data.currentPeriodEnd)}.{' '}
            <Link
              to="/settings?section=billing"
              className="text-primary hover:underline"
            >
              Reactivate
            </Link>{' '}
            to keep your plan.
          </>
        }
      />
    );
  }

  return (
    <PageContextAlert
      variant="error"
      title="Your last payment failed"
      description={
        <>
          {`Update your payment method to keep your ${data.planName} plan active. `}
          <Link
            to="/settings?section=billing&tab=payment"
            className="text-primary hover:underline"
          >
            Update payment method
          </Link>
          .
        </>
      }
    />
  );
}
