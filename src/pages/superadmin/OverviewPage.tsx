import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlatformAnalytics } from '@/queries/usePlatformAnalytics';
import { useSuperAdminPlatformOverviewQuery } from '@/queries/useSuperAdmin';
import type { AnalyticsFilters } from '@/types/platformAnalytics';
import OverviewHeader from './analytics/OverviewHeader';
import PlatformSummary from './analytics/PlatformSummary';
import { defaultRange, validRange } from './analytics/analyticsDisplay';

export default function OverviewPage() {
  const [params, setParams] = useSearchParams();
  const defaults = defaultRange();
  const filters: AnalyticsFilters = {
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    currency: 'USD',
    granularity: 'day',
  };
  const valid = validRange(filters);
  const analytics = usePlatformAnalytics(filters, valid);
  const live = useSuperAdminPlatformOverviewQuery();

  useEffect(() => {
    if (
      ['view', 'currency', 'granularity', 'planId'].some((key) =>
        params.has(key),
      )
    ) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const key of ['view', 'currency', 'granularity', 'planId']) {
            next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    }
  }, [params, setParams]);

  const update = (next: Partial<AnalyticsFilters>) =>
    setParams(
      (previous) => {
        const result = new URLSearchParams(previous);
        for (const key of ['from', 'to'] as const) {
          if (next[key]) result.set(key, next[key]);
        }
        return result;
      },
      { replace: true },
    );
  const mainError = analytics.isError
    ? 'Overview data could not be loaded. Refresh to retry; live queue status may still be available.'
    : !valid
      ? 'Choose an ordered UTC date range of at most 366 days, ending no later than tomorrow.'
      : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-4">
      <OverviewHeader
        filters={filters}
        update={update}
        refresh={() => {
          void analytics.refetch();
          void live.refetch();
        }}
        refreshing={analytics.isFetching || live.isFetching}
        valid={valid}
      />
      <PlatformSummary
        analytics={analytics}
        live={live}
        valid={valid}
        mainError={mainError}
      />
    </div>
  );
}
