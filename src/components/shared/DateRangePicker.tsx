import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRangeValue {
  from?: string;
  to?: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
}

function toDate(iso?: string): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

function toIso(date?: Date): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined;
}

/** Single-trigger date picker backed by shadcn's Calendar in range mode — one
 * click selects a single date, a second click extends it into a range. */
export default function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
}: DateRangePickerProps) {
  const selected: DateRange | undefined = value.from
    ? { from: toDate(value.from), to: toDate(value.to) }
    : undefined;

  const label = selected?.from
    ? selected.to && selected.to.getTime() !== selected.from.getTime()
      ? `${format(selected.from, 'MMM d')} – ${format(selected.to, 'MMM d, yyyy')}`
      : format(selected.from, 'MMM d, yyyy')
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'bg-muted justify-start font-normal',
            !selected?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) =>
            onChange({ from: toIso(range?.from), to: toIso(range?.to) })
          }
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
