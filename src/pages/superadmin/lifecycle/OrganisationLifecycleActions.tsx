import {
  Archive,
  CircleStop,
  CreditCard,
  Play,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import LifecycleConfirmDialog from './LifecycleConfirmDialog';

import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import {
  useClearPaymentHoldMutation,
  useHoldOrganisationWorkMutation,
  useImposePaymentHoldMutation,
  useResumeOrganisationWorkMutation,
  useTransitionOrganisationStatusMutation,
} from '@/queries/useSuperAdmin';
import type { SuperAdminOrganisationDetail } from '@/types';

// Actions bar for the Organisation Detail page. Each button opens its
// dedicated dialog — the doc explicitly says "hold, resume, and cancel
// are separately audited and separately authorised; never present them
// behind a single button labelled 'Stop'." One button per intent here.

type ActionKey =
  | 'suspend'
  | 'reactivate'
  | 'archive'
  | 'hold'
  | 'resume'
  | 'impose-payment-hold'
  | 'clear-payment-hold';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function OrganisationLifecycleActions({
  organisation,
}: {
  organisation: SuperAdminOrganisationDetail;
}) {
  const [openAction, setOpenAction] = useState<ActionKey | null>(null);
  const closeDialog = () => setOpenAction(null);

  const transitionMutation = useTransitionOrganisationStatusMutation(
    organisation.id,
  );
  const holdMutation = useHoldOrganisationWorkMutation(organisation.id);
  const resumeMutation = useResumeOrganisationWorkMutation(organisation.id);
  const imposeHoldMutation = useImposePaymentHoldMutation(organisation.id);
  const clearHoldMutation = useClearPaymentHoldMutation(organisation.id);

  const paymentHoldActive =
    (organisation as SuperAdminOrganisationDetail & {
      paymentHoldActive?: boolean;
    }).paymentHoldActive ?? false;

  const handleTransition = (
    targetStatus: 'active' | 'suspended' | 'archived',
    reason: string,
  ) => {
    transitionMutation.mutate(
      { targetStatus, confirmName: organisation.name, reason },
      {
        onSuccess: (data) => {
          // GAP-046 / SA-411 — summarise every non-zero axis of the
          // cascade so the operator sees a concrete list of what changed
          // instead of a vague "done" toast. Skips zero/absent axes so
          // the message stays scannable.
          const parts: string[] = [];
          const { cascade } = data;
          if (cascade.pausedJobs) {
            parts.push(
              `${cascade.pausedJobs} job${cascade.pausedJobs === 1 ? '' : 's'} paused`,
            );
          }
          if (cascade.queuedRemoved) {
            parts.push(
              `${cascade.queuedRemoved} queued run${cascade.queuedRemoved === 1 ? '' : 's'} removed`,
            );
          }
          if (cascade.usersAffected) {
            parts.push(
              `${cascade.usersAffected} tenant user${cascade.usersAffected === 1 ? '' : 's'} affected`,
            );
          }
          if (cascade.associationRulesAffected) {
            parts.push(
              `${cascade.associationRulesAffected} association rule${cascade.associationRulesAffected === 1 ? '' : 's'} paused`,
            );
          }
          if (cascade.queuesAffected && cascade.queuesAffected.length > 0) {
            parts.push(`queues: ${cascade.queuesAffected.join(', ')}`);
          }
          if (cascade.billingTreatment && cascade.billingTreatment !== 'preserved') {
            parts.push(`billing: ${cascade.billingTreatment}`);
          }
          const detail = parts.length > 0 ? ` — ${parts.join(', ')}.` : '';
          showToast.success(`Organisation ${data.status}.${detail}`);
          closeDialog();
        },
      },
    );
  };

  const canSuspend = organisation.status === 'active';
  const canReactivate = organisation.status === 'suspended';
  const canArchive = organisation.status === 'suspended';
  const canHold = organisation.status === 'active';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canSuspend ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('suspend')}
          >
            <ShieldCheck className="size-4" aria-hidden />
            Suspend
          </Button>
        ) : null}
        {canReactivate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('reactivate')}
          >
            <PlayCircle className="size-4" aria-hidden />
            Reactivate
          </Button>
        ) : null}
        {canArchive ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('archive')}
          >
            <Archive className="size-4" aria-hidden />
            Archive
          </Button>
        ) : null}
        {canHold ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('hold')}
          >
            <CircleStop className="size-4" aria-hidden />
            Hold work
          </Button>
        ) : null}
        {canHold ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAction('resume')}
          >
            <Play className="size-4" aria-hidden />
            Resume held work
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setOpenAction(
              paymentHoldActive ? 'clear-payment-hold' : 'impose-payment-hold',
            )
          }
        >
          <CreditCard className="size-4" aria-hidden />
          {paymentHoldActive ? 'Clear payment hold' : 'Impose payment hold'}
        </Button>
      </div>

      <LifecycleConfirmDialog
        open={openAction === 'suspend'}
        onOpenChange={(o) => (o ? setOpenAction('suspend') : closeDialog())}
        title="Suspend organisation"
        description="Reject every tenant token, cancel queued Bull runs, pause every scheduled job. Reactivating later does not automatically re-queue lost runs."
        bodyWarning="Active runs finish their current batch and stop with checkpoint preserved. Tenant users cannot sign in until the organisation is reactivated."
        actionLabel="Suspend"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being suspended?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? extractErrorMessage(transitionMutation.error)
            : null
        }
        onSubmit={({ reason }) => handleTransition('suspended', reason)}
      />

      <LifecycleConfirmDialog
        open={openAction === 'reactivate'}
        onOpenChange={(o) => (o ? setOpenAction('reactivate') : closeDialog())}
        title="Reactivate organisation"
        description="Restore tenant sign-in and let the operator team re-enable scheduled work manually. Reactivation does not re-queue runs skipped while suspended."
        bodyWarning="Jobs stay paused (is_enabled=false). Members re-enable each job manually after reactivation."
        actionLabel="Reactivate"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being reactivated?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? extractErrorMessage(transitionMutation.error)
            : null
        }
        onSubmit={({ reason }) => handleTransition('active', reason)}
      />

      <LifecycleConfirmDialog
        open={openAction === 'archive'}
        onOpenChange={(o) => (o ? setOpenAction('archive') : closeDialog())}
        title="Archive organisation"
        description="Soft-delete this organisation. Retained for the recovery window then hard-deleted by the reaper. This action can only run from the suspended state."
        bodyWarning="Reactivation from archive requires stepping through suspended first. Beyond the retention window, the record is permanently deleted with no restore path."
        actionLabel="Archive"
        tone="danger"
        organisationName={organisation.name}
        requiresNameConfirm
        minReasonLength={20}
        reasonPlaceholder="What triggered this archive? (min 20 characters)"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? extractErrorMessage(transitionMutation.error)
            : null
        }
        onSubmit={({ reason }) => handleTransition('archived', reason)}
      />

      <LifecycleConfirmDialog
        open={openAction === 'hold'}
        onOpenChange={(o) => (o ? setOpenAction('hold') : closeDialog())}
        title="Hold work for this organisation"
        description="Pause future scheduling without cancelling running or queued work. Active runs finish; the next tick does not enqueue new work until you resume."
        actionLabel="Hold work"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm={false}
        minReasonLength={0}
        reasonPlaceholder="Optional context for the audit trail"
        isSubmitting={holdMutation.isPending}
        errorMessage={
          holdMutation.isError ? extractErrorMessage(holdMutation.error) : null
        }
        onSubmit={({ reason }) => {
          holdMutation.mutate(
            { reason: reason || undefined },
            {
              onSuccess: (data) => {
                showToast.success(
                  `Held ${data.heldJobs} job${data.heldJobs === 1 ? '' : 's'}.`,
                );
                closeDialog();
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'resume'}
        onOpenChange={(o) => (o ? setOpenAction('resume') : closeDialog())}
        title="Resume held work"
        description="Return every operator-held job to the active schedule. Does not touch tenant-paused jobs."
        actionLabel="Resume held work"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm={false}
        minReasonLength={0}
        reasonPlaceholder="Optional context for the audit trail"
        isSubmitting={resumeMutation.isPending}
        errorMessage={
          resumeMutation.isError
            ? extractErrorMessage(resumeMutation.error)
            : null
        }
        onSubmit={() => {
          resumeMutation.mutate(undefined, {
            onSuccess: (data) => {
              showToast.success(
                `Resumed ${data.resumedJobs} job${data.resumedJobs === 1 ? '' : 's'}.`,
              );
              closeDialog();
            },
          });
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'impose-payment-hold'}
        onOpenChange={(o) =>
          o ? setOpenAction('impose-payment-hold') : closeDialog()
        }
        title="Impose payment hold"
        description="Stop the scheduler for this organisation independent of billing state. Tenant reads still work; scheduled and queued runs are held."
        bodyWarning="Use for compliance / security holds only. Billing-driven holds arrive automatically from the Stripe webhook — not this button."
        actionLabel="Impose hold"
        tone="danger"
        organisationName={organisation.name}
        requiresNameConfirm
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being manually held?"
        isSubmitting={imposeHoldMutation.isPending}
        errorMessage={
          imposeHoldMutation.isError
            ? extractErrorMessage(imposeHoldMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          imposeHoldMutation.mutate(
            { reason, confirmName: organisation.name },
            {
              onSuccess: () => {
                showToast.success('Payment hold imposed.');
                closeDialog();
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'clear-payment-hold'}
        onOpenChange={(o) =>
          o ? setOpenAction('clear-payment-hold') : closeDialog()
        }
        title="Clear payment hold"
        description="Lift the current manual/payment hold. Scheduler resumes for this organisation on the next tick."
        actionLabel="Clear hold"
        tone="warning"
        organisationName={organisation.name}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this hold being cleared?"
        isSubmitting={clearHoldMutation.isPending}
        errorMessage={
          clearHoldMutation.isError
            ? extractErrorMessage(clearHoldMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          clearHoldMutation.mutate(
            { reason },
            {
              onSuccess: () => {
                showToast.success('Payment hold cleared.');
                closeDialog();
              },
            },
          );
        }}
      />
    </>
  );
}
