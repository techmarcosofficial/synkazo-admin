import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Building2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  headingSubtitleStyles,
  headingTitleStyles,
} from '@/components/shared/headingStyles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  OrgStatus,
  SubscriptionStatus,
  SuperAdminOrganisationListItem,
} from '@/types';

export const ORG_STATUS_LABELS: Record<OrgStatus | 'all', string> = {
  all: 'All statuses',
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
  archived: 'Archived',
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus | 'all', string> = {
  all: 'All billing',
  none: 'No subscription',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Cancelled',
  incomplete: 'Incomplete',
  unpaid: 'Unpaid',
  paused: 'Paused',
  pending_cancel: 'Cancelling',
};

export function OrganisationStatusBadge({ status }: { status: OrgStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === 'active' && 'bg-success/10',
        status === 'suspended' && 'bg-warning/10',
        status === 'pending' && 'bg-info/10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          status === 'active' && 'bg-success',
          status === 'suspended' && 'bg-warning',
          status === 'pending' && 'bg-info',
          status === 'archived' && 'bg-muted-foreground',
        )}
      />
      {ORG_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SubscriptionStatusBadge({
  status,
  showContext = false,
}: {
  status: SubscriptionStatus;
  showContext?: boolean;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === 'active' && 'bg-success/10',
        (status === 'trialing' || status === 'pending_cancel') &&
          'bg-warning/10',
        (status === 'past_due' || status === 'unpaid') && 'bg-destructive/10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          status === 'active' && 'bg-success',
          (status === 'trialing' || status === 'pending_cancel') &&
            'bg-warning',
          (status === 'past_due' || status === 'unpaid') && 'bg-destructive',
          ![
            'active',
            'trialing',
            'pending_cancel',
            'past_due',
            'unpaid',
          ].includes(status) && 'bg-muted-foreground',
        )}
      />
      {showContext
        ? `Billing: ${SUBSCRIPTION_LABELS[status]}`
        : SUBSCRIPTION_LABELS[status]}
    </Badge>
  );
}

/** Mirrors the tenant project card's visual structure with organisation data. */
export default function OrganisationDirectoryCard({
  organisation,
}: {
  organisation: SuperAdminOrganisationListItem;
}) {
  const to = `/super-admin/organisations/${organisation.id}/overview`;

  return (
    <Card
      size="sm"
      className="hover:border-foreground/20 focus-within:border-foreground/20 h-full transition-all duration-200 ease-out focus-within:-translate-y-1 hover:-translate-y-1"
    >
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <Building2 className="size-6" aria-hidden />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <OrganisationStatusBadge status={organisation.status} />
            <SubscriptionStatusBadge
              status={organisation.subscriptionStatus}
              showContext
            />
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <Link
            to={to}
            className={cn(
              'hover:text-primary focus-visible:ring-ring block truncate rounded-sm transition-colors outline-none focus-visible:ring-2',
              headingTitleStyles.section,
            )}
          >
            {organisation.name}
          </Link>
          <p
            className={cn(
              'text-muted-foreground truncate',
              headingSubtitleStyles.card,
            )}
          >
            {organisation.slug}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            Owner: {organisation.owner?.email ?? 'Not assigned'}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            Plan: {organisation.plan.name}
          </p>
        </div>

        <dl className="bg-secondary/40 border-border/60 mt-auto grid grid-cols-2 gap-3 rounded-2xl border p-3.5">
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Members
            </dt>
            <dd className="text-foreground mt-1 text-lg font-bold tracking-tight tabular-nums">
              {organisation.memberCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Projects
            </dt>
            <dd className="text-foreground mt-1 text-lg font-bold tracking-tight tabular-nums">
              {organisation.projectCount}
            </dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
          <Clock className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            Created{' '}
            {formatDistanceToNow(new Date(organisation.createdAt), {
              addSuffix: true,
            })}
          </span>
        </span>
        <Link
          to={to}
          className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
        >
          View organisation
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}
