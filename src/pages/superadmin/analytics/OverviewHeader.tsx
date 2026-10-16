import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, RefreshCw } from 'lucide-react';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { AnalyticsFilters } from '@/types/platformAnalytics';
import { defaultRange, utcDay, validRange } from './analyticsDisplay';

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
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<DateRange>();
  const isMobile = useIsMobile();
  const through = inclusiveEnd(filters.to);
  const today = new Date(`${inclusiveEnd(defaultRange().to)}T00:00:00Z`);
  const selectedFilters =
    selection?.from && selection.to
      ? {
          from: utcDay(selection.from),
          to: utcDay(
            new Date(
              Date.UTC(
                selection.to.getUTCFullYear(),
                selection.to.getUTCMonth(),
                selection.to.getUTCDate() + 1,
              ),
            ),
          ),
        }
      : undefined;
  const canApply =
    !!selectedFilters && validRange({ ...filters, ...selectedFilters });
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
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen)
              setSelection(
                valid
                  ? {
                      from: new Date(`${filters.from}T00:00:00Z`),
                      to: new Date(`${through}T00:00:00Z`),
                    }
                  : undefined,
              );
            setOpen(nextOpen);
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Choose date range">
              <CalendarDays />
              {valid
                ? `${format(filters.from)} – ${format(through)}`
                : 'Choose dates'}
              <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            aria-label="Choose reporting dates"
            className="max-h-(--radix-popover-content-available-height) w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto rounded-3xl p-0"
          >
            <div className="border-b p-3">
              <p className="text-sm font-medium">Date range</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Processing and payment period · UTC
              </p>
              <div className="mt-3 flex gap-1" aria-label="Quick date ranges">
                {[7, 30, 90].map((days) => (
                  <Button
                    key={days}
                    size="sm"
                    variant={
                      filters.from === defaultRange(days).from &&
                      filters.to === defaultRange(days).to
                        ? 'secondary'
                        : 'ghost'
                    }
                    onClick={() => {
                      update(defaultRange(days));
                      setOpen(false);
                    }}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
            </div>
            <Calendar
              mode="range"
              required
              timeZone="UTC"
              selected={selection}
              onSelect={setSelection}
              defaultMonth={selection?.from ?? today}
              numberOfMonths={isMobile ? 1 : 2}
              captionLayout="dropdown"
              showOutsideDays={false}
              disabled={{ after: today }}
              endMonth={today}
              max={365}
            />
            <div className="grid gap-3 border-t p-3">
              <p className="text-muted-foreground max-w-56 text-xs md:max-w-md">
                Up to 366 days, including both dates. Customer and queue status
                always show the latest snapshot.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!canApply}
                  onClick={() => {
                    if (canApply && selectedFilters) {
                      update(selectedFilters);
                      setOpen(false);
                    }
                  }}
                >
                  Apply range
                </Button>
              </div>
            </div>
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
