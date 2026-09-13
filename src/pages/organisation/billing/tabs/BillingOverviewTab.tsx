import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  FileText,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  daysLeft,
  featureList,
  FeatureRow,
  formatDate,
  usageTone,
} from '../lib/billingDisplay';

import ErrorState from '@/components/shared/ErrorState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
  usePlanQuery,
  usePlansQuery,
  useUsageQuery,
} from '@/queries/useBilling';

function billingIntervalLabel(interval?: string | null) {
  if (interval === 'year') return 'Yearly';
  if (interval === 'day') return 'Daily';
  return 'Monthly';
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function ThinMeter({
  value,
  indicatorClassName,
}: {
  value: number;
  indicatorClassName?: string;
}) {
  return (
    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
      <div
        className={cn(
          'bg-primary h-full rounded-full transition-[width]',
          indicatorClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CompactLimitRow({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) {
  const rawPct = limit ? (count / limit) * 100 : 100;
  const over = limit != null && count >= limit;

  return (
    <div className="bg-muted/45 space-y-2 rounded-3xl px-4 py-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">
          <strong className="text-foreground font-semibold">
            {count.toLocaleString()}
          </strong>{' '}
          of {limit == null ? 'unlimited' : limit.toLocaleString()}
        </span>
      </div>
      <ThinMeter
        value={rawPct}
        indicatorClassName={
          over
            ? 'bg-destructive'
            : limit == null
              ? 'bg-muted-foreground/25'
              : undefined
        }
      />
    </div>
  );
}

export default function BillingOverviewTab() {
  const planQuery = usePlanQuery();
  const usageQuery = useUsageQuery();
  const plansQuery = usePlansQuery(
    planQuery.data?.billingInterval ?? undefined,
  );

  if (planQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
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
  const features = featureList(plan.limits);
  const includedFeatures = features.filter((feature) => feature.enabled);
  const excludedFeatures = features.filter((feature) => !feature.enabled);
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

  const cataloguePlan = plansQuery.data?.find(
    (candidate) => candidate.id === plan.planId,
  );
  const currentPrice = cataloguePlan?.prices.find(
    (price) => price.billingInterval === plan.billingInterval,
  );
  const renewalLabel = plan.cancelAtPeriodEnd
    ? 'Subscription ends'
    : plan.subscriptionStatus === 'trialing'
      ? 'Trial ends'
      : 'Renews on';
  const renewalDate =
    plan.subscriptionStatus === 'trialing'
      ? plan.trialEndsAt
      : plan.currentPeriodEnd;

  return (
    <div className="flex flex-col gap-4">
      <Card data-tour="current-plan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="text-muted-foreground size-4" />
            Subscription overview
          </CardTitle>
          <CardDescription>
            Plan, renewal, and usage details in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid overflow-hidden rounded-3xl border sm:grid-cols-2 xl:grid-cols-4">
            <div className="border-b px-4 py-3.5 sm:border-r xl:border-b-0">
              <dt className="text-muted-foreground text-xs">Current plan</dt>
              <dd className="mt-1 text-base font-semibold">{plan.planName}</dd>
              <p className="text-muted-foreground text-xs">
                {billingIntervalLabel(plan.billingInterval)} billing
              </p>
            </div>
            <div className="border-b px-4 py-3.5 xl:border-r xl:border-b-0">
              <dt className="text-muted-foreground text-xs">
                Subscription status
              </dt>
              <dd className="mt-1.5">
                <StatusBadge status={plan.subscriptionStatus} size="sm" />
              </dd>
            </div>
            <div className="border-b px-4 py-3.5 sm:border-r sm:border-b-0 xl:border-r">
              <dt className="text-muted-foreground text-xs">{renewalLabel}</dt>
              <dd className="mt-1 text-sm font-semibold">
                {formatDate(renewalDate)}
              </dd>
              {trialDays != null && (
                <p className="text-muted-foreground text-xs">
                  {trialDays} day{trialDays === 1 ? '' : 's'} remaining
                </p>
              )}
            </div>
            <div className="px-4 py-3.5">
              <dt className="text-muted-foreground text-xs">Monthly usage</dt>
              {usageQuery.isLoading || !usage ? (
                <Skeleton className="mt-2 h-5 w-28" />
              ) : (
                <>
                  <dd className="mt-1 text-sm font-semibold">
                    {usage.recordsSynced.toLocaleString()}
                    {usage.maxRecordsPerMonth != null
                      ? ` of ${usage.maxRecordsPerMonth.toLocaleString()}`
                      : ' records'}
                  </dd>
                  <p className={cn('text-xs', usageToneInfo.text)}>
                    {usage.maxRecordsPerMonth == null
                      ? 'Unlimited'
                      : `${Math.round(usageRawPct)}% used`}
                  </p>
                </>
              )}
            </div>
          </dl>

          <div data-tour="usage-section" className="space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Gauge className="text-muted-foreground size-4" /> Usage this
                  month
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Current billing period
                  {usage ? ` · since ${formatDate(usage.periodStart)}` : ''}
                </p>
              </div>
              {usage && (
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {usage.recordsSynced.toLocaleString()}
                    {usage.maxRecordsPerMonth != null
                      ? ` of ${usage.maxRecordsPerMonth.toLocaleString()} records used`
                      : ' records used'}
                  </p>
                  <p
                    className={cn('text-xs font-semibold', usageToneInfo.text)}
                  >
                    {usage.maxRecordsPerMonth == null
                      ? 'Unlimited'
                      : `${Math.round(usageRawPct)}%`}
                  </p>
                </div>
              )}
            </div>

            {usageQuery.isLoading || !usage ? (
              <Skeleton className="h-1.5 w-full" />
            ) : (
              <ThinMeter
                value={usage.maxRecordsPerMonth == null ? 0 : usageRawPct}
                indicatorClassName={usageToneInfo.bar}
              />
            )}

            {usageOver && (
              <Alert
                variant="destructive"
                className="border-destructive/20 bg-destructive/5 rounded-3xl"
              >
                <AlertCircle />
                <AlertTitle>Monthly record limit reached</AlertTitle>
                <AlertDescription>
                  New syncs are blocked until the next billing cycle or until
                  your plan is upgraded.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild>
                <a href={`${import.meta.env.VITE_FRONTEND_URL}/pricing`}>
                  <Sparkles /> Upgrade plan
                </a>
              </Button>
              {hasSubscription && (
                <Button
                  asChild
                  variant="outline"
                  data-tour="manage-subscription"
                >
                  <Link to="/organization/billing/subscription">
                    Manage subscription
                  </Link>
                </Button>
              )}
            </div>

            {plan.subscriptionStatus === 'trialing' &&
              !plan.cancelAtPeriodEnd && (
                <p className="text-muted-foreground text-xs">
                  Billing begins automatically after the trial. Cancel before{' '}
                  {formatDate(plan.trialEndsAt)} to avoid charges.
                </p>
              )}
            {plan.cancelAtPeriodEnd && (
              <p className="text-warning text-xs">
                Cancellation is scheduled for the end of this billing period.
              </p>
            )}
            {plan.subscriptionStatus === 'past_due' && (
              <p className="text-destructive text-xs">
                Your last payment failed. Update your payment method to keep the
                plan active.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4" /> Plan limits
              &amp; features
            </CardTitle>
            <CardDescription>
              Included in your {plan.planName} plan and current usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase">
                Resource usage
              </p>
              {plan.overLimit ? (
                <>
                  <CompactLimitRow
                    label="Projects"
                    count={plan.overLimit.projects.count}
                    limit={plan.overLimit.projects.limit}
                  />
                  <CompactLimitRow
                    label="Sync jobs"
                    count={plan.overLimit.jobs.count}
                    limit={plan.overLimit.jobs.limit}
                  />
                  <CompactLimitRow
                    label="Team members"
                    count={plan.overLimit.teamMembers.count}
                    limit={plan.overLimit.teamMembers.limit}
                  />
                </>
              ) : (
                <Skeleton className="h-36 w-full" />
              )}
            </div>

            <div className="space-y-5 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                  Included
                </p>
                <ul className="space-y-2">
                  {includedFeatures.map((feature) => (
                    <FeatureRow
                      key={feature.label}
                      enabled
                      label={feature.label}
                    />
                  ))}
                </ul>
              </div>
              {excludedFeatures.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                    Not included
                  </p>
                  <ul className="space-y-2">
                    {excludedFeatures.map((feature) => (
                      <FeatureRow
                        key={feature.label}
                        enabled={false}
                        label={feature.label}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground size-4" />
              Upcoming billing
            </CardTitle>
            <CardDescription>Your next billing event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 overflow-hidden rounded-3xl border">
              <div className="border-r p-3.5">
                <p className="text-muted-foreground text-xs">{renewalLabel}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(renewalDate)}
                </p>
              </div>
              <div className="p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{plan.planName}</p>
                  <Badge variant="secondary">
                    {billingIntervalLabel(plan.billingInterval)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {currentPrice
                    ? `${formatPrice(currentPrice.amount, currentPrice.currency)} / ${plan.billingInterval ?? 'month'}`
                    : 'Current subscription'}
                </p>
              </div>
            </div>

            <p className="text-muted-foreground text-xs leading-5">
              {plan.cancelAtPeriodEnd
                ? 'Your subscription will not renew after this period.'
                : 'Your subscription renews automatically on the date shown above.'}
            </p>

            <Button asChild variant="outline" className="w-full">
              <Link to="/organization/billing/invoices">View invoices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
