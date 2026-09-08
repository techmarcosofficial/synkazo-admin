import { AlertCircle, Building2, Mail, Users } from 'lucide-react';

import PlanBadge from '@/components/shared/PlanBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
import { usageTone } from '@/pages/organisation/billing/lib/billingDisplay';
import { usePlanQuery, useUsageQuery } from '@/queries/useBilling';
import { useInvitationsQuery } from '@/queries/useInvitations';
import { useMyOrgQuery } from '@/queries/useOrganisations';
import { useUsersQuery } from '@/queries/useUsers';

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * Identity and status for the organisation being viewed, composed like the
 * Project and Sync Job detail headers: icon + title block on the left, compact
 * status rail on the right, tab strip beneath (supplied by OrganizationLayout).
 *
 * Editors see the identity half. The invitation count and usage meter come from
 * org_admin-only endpoints, so those queries are skipped rather than fired and
 * left to 403.
 */
export default function OrganizationHeader() {
  const { currentUser, hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');

  const orgQuery = useMyOrgQuery();
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const invitationsQuery = useInvitationsQuery({ enabled: canManage });
  const { data: plan } = usePlanQuery();
  const { data: usage } = useUsageQuery({ enabled: canManage });

  const org = orgQuery.data;
  const memberCount = usersQuery.data?.length;
  const pendingCount = invitationsQuery.data?.filter(
    (i) => i.status === 'pending',
  ).length;

  const limit = usage?.maxRecordsPerMonth ?? null;
  const used = usage?.recordsSynced ?? 0;
  const rawPct = limit ? (used / limit) * 100 : 0;
  const over = limit != null && used >= limit;
  // Only surface the meter once it actually matters — a healthy org does not
  // need a usage pill competing with the plan and status badges.
  const showUsage = limit != null && rawPct >= 70;
  const tone = usageTone(rawPct, over);

  return (
    <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Building2 className="text-muted-foreground size-6" />
        </div>

        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            Organization
          </h1>

          {orgQuery.isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            org?.name && (
              <p className="truncate text-sm font-medium">{org.name}</p>
            )
          )}

          <p className="text-muted-foreground text-sm leading-5">
            Manage your organization's information, members, access, and
            subscription.
          </p>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-sm">
            {memberCount != null && (
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {plural(memberCount, 'member', 'members')}
              </span>
            )}
            {canManage && pendingCount != null && pendingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {plural(
                  pendingCount,
                  'pending invitation',
                  'pending invitations',
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-1.5 lg:items-end">
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {plan && <PlanBadge planName={plan.planName} />}
          {plan?.subscriptionStatus && (
            <StatusBadge status={plan.subscriptionStatus} size="sm" />
          )}
          {showUsage && (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                over
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-warning/10 text-warning',
              )}
            >
              <AlertCircle className="size-3.5" />
              {used.toLocaleString()} / {limit!.toLocaleString()} records used
            </span>
          )}
        </div>

        {/* Muted rather than toned: the pill above already carries the severity
            colour, and repeating it on the explanation makes the header shout. */}
        {showUsage && (
          <p className="text-muted-foreground text-xs">
            {over
              ? 'Monthly limit reached · Upgrade to continue syncing'
              : `${tone.label} · ${(limit! - used).toLocaleString()} records remaining`}
          </p>
        )}
      </div>
    </div>
  );
}
