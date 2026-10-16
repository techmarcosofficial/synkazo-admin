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
export const hours = (milliseconds: number) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(milliseconds / 3600000)} h`;
export const utcDay = (date: Date) => date.toISOString().slice(0, 10);
export const dateLabel = (day: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));

export function currencyDigits(currency: string) {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/** Preserve exact minor units even beyond Number.MAX_SAFE_INTEGER. */
export function moneyLabel(
  minor: string | null | undefined,
  currency: string,
): string {
  if (minor == null || !/^-?\d+$/.test(minor)) return '—';
  const amount = BigInt(minor),
    absolute = amount < 0n ? -amount : amount;
  const digits = currencyDigits(currency),
    scale = 10n ** BigInt(digits),
    major = absolute / scale;
  const signed = amount < 0n ? (major === 0n ? -0 : -major) : major;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency })
    .formatToParts(signed)
    .map((part) =>
      part.type === 'fraction'
        ? (absolute % scale).toString().padStart(digits, '0')
        : part.value,
    )
    .join('');
}

export function chartMoney(
  minor: string | null,
  currency: string,
): number | null {
  if (minor == null || !/^-?\d+$/.test(minor)) return null;
  const amount = BigInt(minor);
  if (
    amount > BigInt(Number.MAX_SAFE_INTEGER) ||
    amount < BigInt(Number.MIN_SAFE_INTEGER)
  )
    return null;
  return Number(amount) / 10 ** currencyDigits(currency);
}

export function runHoursPerHundred(
  durationMs: number,
  missingDurationRuns: number,
  minor: string | null,
  currency: string,
): string {
  const collections = chartMoney(minor, currency);
  if (missingDurationRuns > 0 || collections == null || collections <= 0)
    return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(
    (durationMs / 3600000 / collections) * 100,
  );
}

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
