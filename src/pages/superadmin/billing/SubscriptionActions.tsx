import { CircleStop, PlayCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import {
  useCancelSubscriptionAtPeriodEndMutation,
  useCancelSubscriptionImmediateMutation,
  useResumeSubscriptionMutation,
} from '@/queries/useSuperAdmin';
import type {
  SubscriptionStatus,
  SuperAdminOrganisationDetail,
} from '@/types';

type ActionKey = 'cancel-scheduled' | 'resume' | 'cancel-immediate';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

interface SubscriptionActionsProps {
  organisation: SuperAdminOrganisationDetail;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
}

// SA-703/704 — each button opens its own dialog and hits its own
// endpoint. Never one "Stop" button that switches on state; the doc
// bans that shape at the UX level as well as the API level.
export default function SubscriptionActions({
  organisation,
  subscriptionStatus,
  cancelAtPeriodEnd,
}: SubscriptionActionsProps) {
  const [openAction, setOpenAction] = useState<ActionKey | null>(null);
  const close = () => setOpenAction(null);

  const cancelScheduledMutation =
    useCancelSubscriptionAtPeriodEndMutation(organisation.id);
  const resumeMutation = useResumeSubscriptionMutation(organisation.id);
  const cancelImmediateMutation =
    useCancelSubscriptionImmediateMutation(organisation.id);

  // Same guards as the backend permits:
  // - Cancel-at-period-end requires an active subscription that isn't
  //   already scheduled to cancel.
  // - Resume only reverses a pending_cancel (the delegate service throws
  //   otherwise; the button just avoids inviting the 400).
  // - Cancel-immediate is available whenever a subscription exists at
  //   all — the delegate throws if there is nothing to cancel.
  const hasSubscription = subscriptionStatus !== 'none';
  const canScheduleCancel =
    hasSubscription &&
    !cancelAtPeriodEnd &&
    subscriptionStatus !== 'pending_cancel' &&
    subscriptionStatus !== 'canceled';
  const canResume =
    cancelAtPeriodEnd || subscriptionStatus === 'pending_cancel';
  const canCancelImmediate =
    hasSubscription && subscriptionStatus !== 'canceled';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canScheduleCancel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('cancel-scheduled')}
          >
            <CircleStop className="size-4" aria-hidden />
            Cancel at period end
          </Button>
        ) : null}
        {canResume ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('resume')}
          >
            <PlayCircle className="size-4" aria-hidden />
            Resume subscription
          </Button>
        ) : null}
        {canCancelImmediate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('cancel-immediate')}
          >
            <XCircle className="size-4 text-red-700" aria-hidden />
            Cancel immediately
          </Button>
        ) : null}
      </div>

      <LifecycleConfirmDialog
        open={openAction === 'cancel-scheduled'}
        onOpenChange={(o) =>
          o ? setOpenAction('cancel-scheduled') : close()
        }
        title="Cancel subscription at period end"
        description="The subscription stays active until the end of the current billing period, then cancels. Access continues through that date; no refunds are issued for the current period."
        bodyWarning={
          organisation.plan.subscriptionStatus === 'trialing'
            ? 'This organisation is still trialing. Cancelling at period end ends the trial at its normal expiry.'
            : undefined
        }
        actionLabel="Schedule cancellation"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this subscription being cancelled?"
        isSubmitting={cancelScheduledMutation.isPending}
        errorMessage={
          cancelScheduledMutation.isError
            ? extractErrorMessage(cancelScheduledMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          cancelScheduledMutation.mutate(
            { reason },
            {
              onSuccess: (data) => {
                const untilLabel = data.accessUntil
                  ? new Date(data.accessUntil).toLocaleDateString()
                  : 'the current period end';
                showToast.success(
                  `Cancellation scheduled — access continues until ${untilLabel}.`,
                );
                close();
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'resume'}
        onOpenChange={(o) => (o ? setOpenAction('resume') : close())}
        title="Resume subscription"
        description="Reverse the scheduled cancellation so the subscription renews at the end of the current period as normal."
        actionLabel="Resume subscription"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this cancellation being reversed?"
        isSubmitting={resumeMutation.isPending}
        errorMessage={
          resumeMutation.isError ? extractErrorMessage(resumeMutation.error) : null
        }
        onSubmit={({ reason }) => {
          resumeMutation.mutate(
            { reason },
            {
              onSuccess: () => {
                showToast.success('Subscription resumed.');
                close();
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'cancel-immediate'}
        onOpenChange={(o) =>
          o ? setOpenAction('cancel-immediate') : close()
        }
        title="Cancel subscription immediately"
        description="Access ends now — mid-period cancellation with no refund. The organisation flips to the Free plan and the subscription status becomes cancelled."
        bodyWarning="This bypasses the standard cancel-at-period-end flow. Use for chargebacks, compliance holds, or explicit customer requests — not for routine churn."
        actionLabel="Cancel now"
        tone="danger"
        organisationName={organisation.name}
        requiresNameConfirm
        minReasonLength={20}
        reasonPlaceholder="Why is this subscription being force-cancelled? (min 20 characters)"
        isSubmitting={cancelImmediateMutation.isPending}
        errorMessage={
          cancelImmediateMutation.isError
            ? extractErrorMessage(cancelImmediateMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          cancelImmediateMutation.mutate(
            { reason },
            {
              onSuccess: () => {
                showToast.success('Subscription cancelled immediately.');
                close();
              },
            },
          );
        }}
      />
    </>
  );
}
