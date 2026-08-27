import { Milestone, Table as TableIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BillingHistoryViewMode = 'table' | 'timeline';

/** Table/timeline toggle, styled like the app's table/card ViewToggle but scoped to these two
 * billing tabs — kept local rather than reusing ManagementViewMode since that's table/card only. */
export function BillingHistoryViewToggle({
  value,
  onChange,
}: {
  value: BillingHistoryViewMode;
  onChange: (mode: BillingHistoryViewMode) => void;
}) {
  return (
    <div className="bg-muted flex rounded-3xl p-1">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Table view"
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
        className={cn(
          'h-7 rounded-2xl p-0',
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
          'h-7 rounded-2xl p-0',
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
}

/** Newest-first vertical timeline — a connecting line down the left edge with one status dot
 * per event, sharing the same status color mapping as the table view (STATUS_DOT). */
export function BillingTimeline({ items }: { items: BillingTimelineEntry[] }) {
  return (
    <ol>
      {items.map((item) => (
        <li
          key={item.key}
          className="relative border-l pb-6 pl-6 last:border-transparent last:pb-0"
        >
          <span
            className={cn(
              'ring-background absolute top-0.5 -left-[7px] size-3.5 rounded-full ring-4',
              item.dotClassName ?? 'bg-muted-foreground',
            )}
          />
          <p className="text-muted-foreground text-xs">
            {new Date(item.date).toLocaleString()}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-medium">{item.title}</p>
            {item.amount && (
              <p className="text-sm font-semibold">{item.amount}</p>
            )}
          </div>
          {item.description && (
            <p className="text-muted-foreground text-sm">{item.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
