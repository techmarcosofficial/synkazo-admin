import { CircleAlert, Info } from 'lucide-react';

import { PLATFORMS } from '@/components/platform/platform';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SyncLogRecord } from '@/types';

interface RecordContext {
  sourceObject?: string;
  destObject?: string;
  sourcePlatform?: string;
  destPlatform?: string;
}

interface RecordReasonProps {
  rec: SyncLogRecord;
  context?: RecordContext;
}

interface DetailItem {
  label: string;
  value: string;
}

const REASON_SUMMARIES: Record<string, string> = {
  no_change: 'No changes detected',
  missing_required_field: 'Missing required field',
  duplicate: 'Duplicate record',
  filter_excluded: 'Matched a skip rule',
  no_id_match: 'No destination match',
  manually_excluded: 'Manually excluded',
  matched_no_update: 'Matched record left unchanged',
  record_level_conflict: 'Record-level conflict',
  api_error: 'API error',
  rate_limited: 'Rate limit reached',
  transform_error: 'Transformation failed',
  validation_error: 'Invalid field value',
  auth_error: 'Authentication error',
  network_error: 'Network error',
  unknown: 'Unknown error',
};

const CONTACT_FIELD_NAMES = new Set([
  'email',
  'emailaddress',
  'email_address',
  'phone',
  'phonenumber',
  'phone_number',
  'mobilephone',
  'mobile_phone',
]);

const SOURCE_ID_FIELD_NAMES = new Set([
  'source_record_id',
  'sourcerecordid',
  'record_id',
  'recordid',
  'id',
]);

function enumLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function objectLabel(platform: string | undefined, object: string): string {
  const platformName = platform
    ? (PLATFORMS[platform.toLowerCase()]?.name ?? enumLabel(platform))
    : null;
  return [platformName, enumLabel(object)].filter(Boolean).join(' ');
}

function isEmptyValue(value: unknown): boolean {
  return (
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  );
}

function sanitizeStructuredValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const cleaned = value
      .map(sanitizeStructuredValue)
      .filter((item) => !isEmptyValue(item));
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (value && typeof value === 'object') {
    const cleaned = Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, sanitizeStructuredValue(item)])
        .filter(([, item]) => !isEmptyValue(item)),
    );
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return isEmptyValue(value) ? undefined : value;
}

function parseStructuredValue(value: unknown): unknown {
  if (typeof value !== 'string') return sanitizeStructuredValue(value);

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return sanitizeStructuredValue(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

function formatStructuredValue(value: unknown): string | null {
  const parsed = parseStructuredValue(value);
  if (parsed == null) return null;
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
}

function collectContactDetails(
  value: unknown,
  path: string[] = [],
  details: DetailItem[] = [],
): DetailItem[] {
  const parsed = path.length === 0 ? parseStructuredValue(value) : value;

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) =>
      collectContactDetails(item, [...path, String(index + 1)], details),
    );
    return details;
  }

  if (!parsed || typeof parsed !== 'object') return details;

  Object.entries(parsed).forEach(([key, item]) => {
    if (isEmptyValue(item)) return;

    const normalizedKey = key.toLowerCase().replace(/[\s.-]/g, '_');
    const nextPath = [...path, key];
    const isSourceId =
      SOURCE_ID_FIELD_NAMES.has(normalizedKey) &&
      (normalizedKey !== 'id' ||
        path.length === 0 ||
        path.some((segment) => /source|records?/i.test(segment)));
    if (
      (CONTACT_FIELD_NAMES.has(normalizedKey) || isSourceId) &&
      ['string', 'number'].includes(typeof item)
    ) {
      details.push({
        label: nextPath.join(' › '),
        value: String(item),
      });
      return;
    }

    collectContactDetails(item, nextPath, details);
  });

  return details;
}

function getSummary(rec: SyncLogRecord, reason?: string | null): string {
  const detail = rec.skipReasonDetail || rec.failReasonDetail || '';
  const normalizedDetail = detail.toLowerCase();

  if (
    normalizedDetail.includes('multiple source records') &&
    normalizedDetail.includes('same hubspot id')
  ) {
    return 'Multiple records matched the same HubSpot ID';
  }
  if (
    normalizedDetail.includes('tracked fields conflict') &&
    normalizedDetail.includes('whole record')
  ) {
    return 'Tracked field conflict';
  }
  if (reason === 'api_error' && normalizedDetail.includes('validation')) {
    return 'API validation error';
  }

  if (reason) return REASON_SUMMARIES[reason] ?? enumLabel(reason);

  const firstLine = detail.split(/\r?\n/, 1)[0].trim();
  return firstLine.length > 80
    ? `${firstLine.slice(0, 79).trimEnd()}…`
    : firstLine || 'Reason details';
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="space-y-1.5">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 text-xs"
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecordReason({ rec, context }: RecordReasonProps) {
  const reason = rec.skipReason || rec.failReason;
  const detail = rec.skipReasonDetail || rec.failReasonDetail;

  if (!reason && !detail) {
    return <span className="text-muted-foreground">—</span>;
  }

  const actionLabel = rec.action === 'failed' ? 'Failed' : 'Skipped';
  const summary = getSummary(rec, reason);
  const contactDetails = collectContactDetails(rec.sourceData).filter(
    (item, index, items) =>
      !(
        item.value === rec.sourceRecordId &&
        SOURCE_ID_FIELD_NAMES.has(
          item.label
            .split(' › ')
            .slice(-1)[0]
            .toLowerCase()
            .replace(/[\s.-]/g, '_'),
        )
      ) &&
      items.findIndex(
        (candidate) =>
          candidate.label === item.label && candidate.value === item.value,
      ) === index,
  );
  const mappedData = formatStructuredValue(rec.mappedData);
  const apiDetails = formatStructuredValue(rec.destResponse);
  const sourceItems: DetailItem[] = [
    ...(context?.sourceObject
      ? [
          {
            label: 'Object',
            value: objectLabel(context.sourcePlatform, context.sourceObject),
          },
        ]
      : []),
    ...(rec.sourceRecordId ? [{ label: 'ID', value: rec.sourceRecordId }] : []),
    ...contactDetails,
  ];
  const destinationItems: DetailItem[] = [
    ...(context?.destObject
      ? [
          {
            label: 'Object',
            value: objectLabel(context.destPlatform, context.destObject),
          },
        ]
      : []),
    ...(rec.destRecordId ? [{ label: 'ID', value: rec.destRecordId }] : []),
  ];

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group/reason flex max-w-full min-w-0 items-center gap-1.5 text-left"
          aria-label={`View ${actionLabel.toLowerCase()} reason details: ${summary}`}
        >
          {rec.action === 'failed' ? (
            <CircleAlert className="text-destructive size-3.5 shrink-0" />
          ) : (
            <Info className="text-muted-foreground size-3.5 shrink-0" />
          )}
          <span className="text-muted-foreground group-hover/reason:text-foreground group-focus-visible/reason:text-foreground min-w-0 truncate underline decoration-dotted underline-offset-2 transition-colors">
            {actionLabel}: {summary}
          </span>
        </button>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="bg-popover text-popover-foreground border-border [&>span>svg]:bg-popover [&>span>svg]:fill-popover max-h-[min(28rem,calc(100vh-1.5rem))] w-[min(26rem,calc(100vw-1.5rem))] max-w-none items-stretch overflow-y-auto rounded-2xl border p-0 shadow-xl"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                rec.action === 'failed'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {rec.action === 'failed' ? (
                <CircleAlert className="size-4" />
              ) : (
                <Info className="size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{summary}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent text-[10px]',
                    rec.action === 'failed'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {actionLabel}
                </Badge>
              </div>
              {reason && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {enumLabel(reason)}
                </p>
              )}
            </div>
          </div>

          {detail && (
            <DetailSection title="Reason">
              <p className="bg-muted/50 rounded-xl px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap">
                {detail}
              </p>
            </DetailSection>
          )}

          {sourceItems.length > 0 && (
            <DetailSection title="Source record">
              <DetailList items={sourceItems} />
            </DetailSection>
          )}

          {destinationItems.length > 0 && (
            <DetailSection title="Destination record">
              <DetailList items={destinationItems} />
            </DetailSection>
          )}

          {mappedData && (
            <DetailSection title="Mapped field values">
              <pre className="bg-muted/50 max-w-full rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                {mappedData}
              </pre>
            </DetailSection>
          )}

          {apiDetails && (
            <DetailSection title="API error details">
              <pre className="bg-muted/50 max-w-full rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                {apiDetails}
              </pre>
            </DetailSection>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
