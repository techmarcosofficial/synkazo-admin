import type { AnalyticsFilters } from '@/types/platformAnalytics';

export const compactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
export const fullNumber = (value: number) =>
  new Intl.NumberFormat().format(value);
export const percentage = (value: number | null | undefined) =>
  value == null
    ? '—'
    : new Intl.NumberFormat(undefined, {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(value);
export const utcDay = (date: Date) => date.toISOString().slice(0, 10);
export const dateLabel = (day: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));

export function defaultRange(days = 30, now = new Date()) {
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return { from: utcDay(new Date(+to - days * 86400000)), to: utcDay(to) };
}

export function validRange(filters: AnalyticsFilters) {
  if (
    ![filters.from, filters.to].every((value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value),
    )
  )
    return false;
  const from = Date.parse(`${filters.from}T00:00:00Z`),
    to = Date.parse(`${filters.to}T00:00:00Z`);
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    from < to &&
    to - from <= 366 * 86400000 &&
    to <= Date.parse(`${defaultRange().to}T00:00:00Z`)
  );
}
