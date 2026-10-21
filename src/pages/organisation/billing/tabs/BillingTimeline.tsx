import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
} from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Check,
  Clock,
  Milestone,
  Table as TableIcon,
  X,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BillingHistoryViewMode = 'table' | 'timeline';

/**
 * Table/timeline toggle retained for backward-compatibility.
 */
export function BillingHistoryViewToggle({
  value,
  onChange,
}: {
  value: BillingHistoryViewMode;
  onChange: (mode: BillingHistoryViewMode) => void;
}) {
  return (
    <div className="bg-muted flex rounded-xl p-1">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Table view"
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
        className={cn(
          'p-0',
          value === 'table' ? 'bg-primary text-white' : 'bg-muted',
        )}
      >
        <TableIcon />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Timeline view"
        aria-pressed={value === 'timeline'}
        onClick={() => onChange('timeline')}
        className={cn(
          'p-0',
          value === 'timeline' ? 'bg-primary text-white' : 'bg-muted',
        )}
      >
        <Milestone />
      </Button>
    </div>
  );
}

export interface BillingTimelineEntry {
  key: string | number;
  date: string;
  title: string;
  description?: string | null;
  /** Pre-formatted, e.g. "$29.00" — shown next to the title when present. */
  amount?: string | null;
  /** Dot color class, e.g. "bg-success" — falls back to a neutral dot when omitted. */
  dotClassName?: string;
  status?: string | null;
  paymentId?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
}

function getTimelineVisuals(item: BillingTimelineEntry) {
  const normTitle = (item.title || '').toLowerCase();
  const normStatus = (item.status || '').toLowerCase();
  const dot = item.dotClassName || '';

  if (
    dot.includes('success') ||
    normStatus === 'paid' ||
    normStatus === 'active' ||
    normTitle.includes('succeeded') ||
    normTitle.includes('paid')
  ) {
    return {
      // Solid lime-green fill with opaque card ring to completely mask the spine border behind it
      nodeClass: 'bg-success text-white ring-4 ring-card',
      icon: <Check className="size-2.5 stroke-[3]" aria-hidden="true" />,
      badgeClass: 'bg-success/20 text-success',
      dotClass: 'bg-success',
      displayStatus: item.status ?? 'Paid',
    };
  }

  if (
    dot.includes('destructive') ||
    normStatus === 'failed' ||
    normStatus === 'canceled' ||
    normTitle.includes('fail') ||
    normTitle.includes('cancel')
  ) {
    return {
      // Solid red fill with opaque card ring
      nodeClass: 'bg-destructive text-white ring-4 ring-card',
      icon: <X className="size-2.5 stroke-[3]" aria-hidden="true" />,
      badgeClass: 'bg-destructive/20 text-destructive',
      dotClass: 'bg-destructive',
      displayStatus: item.status ?? 'Failed',
    };
  }

  if (
    dot.includes('warning') ||
    normStatus === 'past_due' ||
    normTitle.includes('hold') ||
    normTitle.includes('past_due')
  ) {
    return {
      // Solid amber/warning fill with opaque card ring
      nodeClass: 'bg-amber-500 text-white ring-4 ring-card',
      icon: <AlertTriangle className="size-2.5 stroke-[3]" aria-hidden="true" />,
      badgeClass: 'bg-warning/20 text-warning',
      dotClass: 'bg-warning',
      displayStatus: item.status ?? 'Past Due',
    };
  }

  if (
    normTitle.includes('plan') ||
    normTitle.includes('subscription') ||
    normTitle.includes('tier')
  ) {
    return {
      // Solid primary fill with opaque card ring
      nodeClass: 'bg-primary text-white ring-4 ring-card',
      icon: <ArrowRightLeft className="size-2.5 stroke-[3]" aria-hidden="true" />,
      badgeClass: 'bg-primary/20 text-primary',
      dotClass: 'bg-primary',
      displayStatus: item.status ?? 'Updated',
    };
  }

  return {
    // Solid neutral fill with opaque card ring
    nodeClass: 'bg-muted-foreground text-white ring-4 ring-card',
    icon: <Clock className="size-2.5 stroke-[3]" aria-hidden="true" />,
    badgeClass: 'bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground',
    displayStatus: item.status ?? null,
  };
}

function formatTimelineDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { timeStr: dateStr, dateKey: 'unknown', displayDay: dateStr, relative: null };
    }
    const timeStr = format(d, 'h:mm a');
    const dateKey = format(d, 'yyyy-MM-dd');
    let displayDay = format(d, 'MMMM d, yyyy');
    if (isToday(d)) {
      displayDay = 'Today · ' + format(d, 'MMM d, yyyy');
    } else if (isYesterday(d)) {
      displayDay = 'Yesterday · ' + format(d, 'MMM d, yyyy');
    }
    return {
      timeStr,
      dateKey,
      displayDay,
      relative: formatDistanceToNow(d, { addSuffix: true }),
    };
  } catch {
    return { timeStr: dateStr, dateKey: 'unknown', displayDay: dateStr, relative: null };
  }
}

interface DateGroup {
  dateKey: string;
  displayDay: string;
  items: BillingTimelineEntry[];
}

function groupEntriesByDate(items: BillingTimelineEntry[]): DateGroup[] {
  const map = new Map<string, { displayDay: string; items: BillingTimelineEntry[] }>();

  for (const item of items) {
    const { dateKey, displayDay } = formatTimelineDate(item.date);
    if (!map.has(dateKey)) {
      map.set(dateKey, { displayDay, items: [] });
    }
    map.get(dateKey)!.items.push(item);
  }

  return Array.from(map.entries()).map(([dateKey, val]) => ({
    dateKey,
    displayDay: val.displayDay,
    items: val.items,
  }));
}

export interface BillingTimelineProps {
  items: BillingTimelineEntry[];
  groupByDate?: boolean;
  className?: string;
}

/**
 * Compact tree/timeline view for chronological billing events.
 * Features:
 * - Solid opaque node fills with card-matching ring to mask the vertical spine completely.
 * - Compact row and card layout for dense, clean audit scanning.
 * - Grouped by purchase day so all events of that purchase event are clustered together.
 */
export function BillingTimeline({
  items,
  groupByDate = true,
  className,
}: BillingTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No activity events found.
      </div>
    );
  }

  const groups = groupByDate
    ? groupEntriesByDate(items)
    : [{ dateKey: 'all', displayDay: '', items }];

  return (
    <div className={cn('space-y-4 select-none', className)}>
      {groups.map((group) => (
        <div key={group.dateKey} className="space-y-2">
          {/* Day Group Header (Clusters all events for that purchase/event date) */}
          {group.displayDay && (
            <div className="flex items-center gap-2 pt-1 pb-0.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground border border-border/50">
                <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
                <span>{group.displayDay}</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({group.items.length} {group.items.length === 1 ? 'event' : 'events'})
                </span>
              </div>
            </div>
          )}

          {/* Timeline Spine & Compact Items */}
          <ol className="relative ml-2.5 sm:ml-3 border-l-2 border-border/70 space-y-2.5 py-0.5">
            {group.items.map((item, index) => {
              const { timeStr, relative } = formatTimelineDate(item.date);
              const visuals = getTimelineVisuals(item);

              return (
                <li
                  key={item.key ?? index}
                  className="relative pl-5 sm:pl-7 group"
                >
                  {/* Solid Opaque Node (ring-4 ring-card masks the vertical spine border completely) */}
                  <span
                    className={cn(
                      'absolute -left-[11px] top-1.5 flex size-5 items-center justify-center rounded-full shadow-xs transition-transform group-hover:scale-110',
                      visuals.nodeClass,
                    )}
                    aria-hidden="true"
                  >
                    {visuals.icon}
                  </span>

                  {/* Compact Event Card */}
                  <div className="rounded-xl border bg-card hover:bg-muted/30 p-2.5 sm:px-3 sm:py-2 transition-all space-y-1.5">
                    {/* Header row: Title + Status + Amount */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground tracking-tight truncate">
                          {item.title}
                        </h4>
                        {visuals.displayStatus && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'border-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 rounded-full h-4',
                              visuals.badgeClass,
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full mr-1 inline-block',
                                visuals.dotClass,
                              )}
                            />
                            {visuals.displayStatus}
                          </Badge>
                        )}
                      </div>

                      {item.amount && (
                        <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                          {item.amount}
                        </span>
                      )}
                    </div>

                    {/* Subline: Time, relative distance, payment reference */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{timeStr}</span>
                      {relative && (
                        <span className="text-[10px] text-muted-foreground/75">&bull; {relative}</span>
                      )}
                      {item.paymentId && (
                        <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-xs">
                          Ref: {item.paymentId}
                        </span>
                      )}
                    </div>

                    {/* Status Transition (e.g. active -> past_due) */}
                    {item.oldStatus && item.newStatus && item.oldStatus !== item.newStatus && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2 py-0.5 w-fit border border-border/40">
                        <span>Status:</span>
                        <span className="capitalize font-medium text-foreground">{item.oldStatus}</span>
                        <ArrowRight className="size-2.5 text-muted-foreground" />
                        <span className="capitalize font-semibold text-foreground">{item.newStatus}</span>
                      </div>
                    )}

                    {/* Description / Audit Note */}
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground/90 leading-normal bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/40">
                        {item.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
