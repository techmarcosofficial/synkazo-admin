import { CreditCard, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  daysLeft,
  featureList,
  FeatureRow,
  formatDate,
  STATUS_LABEL,
  UsageMeter,
  usageTone,
} from '../lib/billingDisplay';

import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePlanQuery, useUsageQuery } from '@/queries/useBilling';

export default function BillingOverviewTab() {
  const planQuery = usePlanQuery();
  const usageQuery = useUsageQuery();

  if (planQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <ErrorState
        description="We couldn't load your billing details."
        onRetry={() => void planQuery.refetch()}
      />
    );
  }

  const plan = planQuery.data;
  const usage = usageQuery.data;
  const over = plan.overLimit;
  const hasSubscription = plan.subscriptionStatus !== 'none';
  const trialDays =
    plan.subscriptionStatus === 'trialing' ? daysLeft(plan.trialEndsAt) : null;
  const usageRawPct =
    usage && usage.maxRecordsPerMonth
      ? (usage.recordsSynced / usage.maxRecordsPerMonth) * 100
      : 0;
  const usageOver =
    !!usage &&
    usage.maxRecordsPerMonth != null &&
    usage.recordsSynced >= usage.maxRecordsPerMonth;
  const usageToneInfo = usageTone(usageRawPct, usageOver);

  return (
    <div className="flex flex-col gap-6">
      <Card data-tour="current-plan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="text-muted-foreground size-4" /> Current plan
          </CardTitle>
          <CardDescription>
            Your active subscription and renewal details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{plan.planName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {STATUS_LABEL[plan.subscriptionStatus] ??
                  plan.subscriptionStatus}
              </dd>
            </div>
            {plan.billingInterval && (
              <div>
                <dt className="text-muted-foreground">Billing</dt>
                <dd className="font-medium">
                  {plan.billingInterval === 'year'
                    ? 'Yearly'
                    : plan.billingInterval === 'day'
                      ? 'Daily'
                      : 'Monthly'}
                </dd>
              </div>
            )}
            {trialDays != null ? (
              <div>
                <dt className="text-muted-foreground">Trial ends</dt>
                <dd className="font-medium">
                  {formatDate(plan.trialEndsAt)}{' '}
                  <span className="text-muted-foreground">
                    ({trialDays} day{trialDays === 1 ? '' : 's'} left)
                  </span>
                </dd>
              </div>
            ) : null}
            {plan.currentPeriodEnd && (
              <div>
                <dt className="text-muted-foreground">
                  {plan.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
                </dt>
                <dd className="font-medium">
                  {formatDate(plan.currentPeriodEnd)}
                </dd>
              </div>
            )}
          </dl>

          {plan.subscriptionStatus === 'trialing' &&
            !plan.cancelAtPeriodEnd && (
              <p className="text-muted-foreground text-sm">
                After your trial ends, your card is charged automatically and
                the subscription continues. Cancel before{' '}
                {formatDate(plan.trialEndsAt)} to avoid charges.
              </p>
            )}
          {plan.cancelAtPeriodEnd && (
            <p className="text-warning text-sm">
              Your subscription is set to cancel at the end of the current
              period — you'll lose access to your paid features when it ends.
            </p>
          )}
          {plan.subscriptionStatus === 'past_due' && (
            <p className="text-destructive text-sm">
              Your last payment failed. Update your payment method to keep your
              plan active.
            </p>
          )}

          {hasSubscription && (
            <div className="flex flex-wrap gap-3 pt-2">
              {/* Now a real route rather than a local tab-state setter. */}
              <Button asChild data-tour="manage-subscription">
                <Link to="/organization/billing/subscription">
                  Manage subscription
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-tour="usage-section">
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
          <CardDescription>
            Records synced in the current billing period
            {usage ? ` (since ${formatDate(usage.periodStart)})` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {usageQuery.isLoading || !usage ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <>
              <UsageMeter
                label="Sync records"
                count={usage.recordsSynced}
                limit={usage.maxRecordsPerMonth}
              />
              <div className="flex items-center justify-between">
                {usage.remaining != null ? (
                  <p className="text-muted-foreground text-xs">
                    {usage.remaining.toLocaleString()} records remaining this
                    month
                  </p>
                ) : (
                  <span />
                )}
                {usage.maxRecordsPerMonth != null && (
                  <span
                    className={cn('text-xs font-medium', usageToneInfo.text)}
                  >
                    {usageToneInfo.label}
                  </span>
                )}
              </div>
              {usageOver && (
                <p className="text-destructive text-sm">
                  Monthly record limit reached. New syncs are blocked until the
                  next billing cycle or the plan is upgraded.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-muted-foreground size-4" /> Plan limits
            &amp; features
          </CardTitle>
          <CardDescription>
            What's included in the {plan.planName} plan and how much you've
            used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {over && (
            <div className="space-y-5">
              <UsageMeter
                label="Projects"
                count={over.projects.count}
                limit={over.projects.limit}
              />
              <UsageMeter
                label="Sync jobs"
                count={over.jobs.count}
                limit={over.jobs.limit}
              />
              <UsageMeter
                label="Team members"
                count={over.teamMembers.count}
                limit={over.teamMembers.limit}
              />
            </div>
          )}
          <ul className="grid gap-2 border-t pt-4 sm:grid-cols-2">
            {featureList(plan.limits).map((f) => (
              <FeatureRow key={f.label} enabled={f.enabled} label={f.label} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
