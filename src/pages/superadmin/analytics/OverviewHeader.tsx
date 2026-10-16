import { CalendarDays, ChevronDown, RefreshCw } from 'lucide-react';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { AnalyticsFilters } from '@/types/platformAnalytics';
import { defaultRange, utcDay } from './analyticsDisplay';

export function inclusiveEnd(to: string) {
  const date = new Date(`${to}T00:00:00Z`);
  return Number.isFinite(date.getTime())
    ? utcDay(new Date(date.getTime() - 86400000))
    : '';
}

export default function OverviewHeader({
  filters,
  update,
  view,
  setView,
  refresh,
  refreshing,
  valid,
}: {
  filters: AnalyticsFilters;
  update: (next: Partial<AnalyticsFilters>) => void;
  view: 'summary' | 'analytics';
  setView: (view: 'summary' | 'analytics') => void;
  refresh: () => void;
  refreshing: boolean;
  valid: boolean;
}) {
  const through = inclusiveEnd(filters.to);
  const format = (day: string) => {
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(date.getTime())
      ? date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : 'Choose dates';
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <HeadingPair
        level="h1"
        title="Platform overview"
        subtitle="Your organisations, billing and platform health at a glance."
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div
          className="bg-muted/50 inline-flex rounded-2xl border p-0.5"
          role="group"
          aria-label="Overview view"
        >
          {(['summary', 'analytics'] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={view === item ? 'secondary' : 'ghost'}
              className={
                view === item
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground'
              }
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {item === 'summary' ? 'Summary' : 'Analytics'}
            </Button>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Choose date range">
              <CalendarDays />
              {format(filters.from)} – {format(through)}
              <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-3xl">
            <p className="text-sm font-medium">Processing and payment period</p>
            <div className="flex gap-1" aria-label="Quick date ranges">
              {[7, 30, 90].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant="secondary"
                  onClick={() => update(defaultRange(days))}
                >
                  {days} days
                </Button>
              ))}
            </div>
            <label className="grid gap-1 text-xs">
              From (UTC)
              <Input
                type="date"
                aria-label="From date UTC"
                value={filters.from}
                onChange={(event) => update({ from: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Through (UTC)
              <Input
                type="date"
                aria-label="Through date UTC"
                value={through}
                max={inclusiveEnd(defaultRange().to)}
                onChange={(event) => {
                  const date = new Date(`${event.target.value}T00:00:00Z`);
                  if (Number.isFinite(date.getTime()))
                    update({ to: utcDay(new Date(date.getTime() + 86400000)) });
                }}
              />
            </label>
            <p className="text-muted-foreground text-xs">
              Dates include the full UTC day. Customer and queue status always
              show the latest snapshot.
            </p>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!valid || refreshing}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
