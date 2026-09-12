import type { ReactNode } from 'react';

import OverLimitBanner from './OverLimitBanner';
import PastDueBanner from './PastDueBanner';

import { usePlanQuery } from '@/queries/useBilling';
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

const BLOCKING_STATUSES = new Set(['past_due']);

interface AccountContextAlertProps {
  fallback?: ReactNode;
}

/**
 * Resolves account-wide conditions into one page-context notice. It is mounted
 * by page headers/detail layouts, never by the application shell, so no notice
 * can appear before a page's heading.
 */
export default function AccountContextAlert({
  fallback = null,
}: AccountContextAlertProps) {
  const { data } = usePlanQuery();
  const dismissed = useAlertDismissStore((state) => state.dismissed);

  if (!data) return fallback;

  const status = data.subscriptionStatus as string;
  const pendingCancel = status === 'pending_cancel' || data.cancelAtPeriodEnd;
  const paymentFailed = BLOCKING_STATUSES.has(status) && !pendingCancel;

  if (
    paymentFailed ||
    (pendingCancel && !dismissed['account:pending-cancellation'])
  ) {
    return <PastDueBanner />;
  }

  if (data.overLimit?.isOverLimit && !dismissed['account:over-plan-limit']) {
    return <OverLimitBanner />;
  }

  return fallback;
}
