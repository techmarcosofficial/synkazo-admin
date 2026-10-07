import { ArrowRight, CircleAlert, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  analyzeRecordDiagnosis,
  DIAGNOSIS_ICONS,
  type RecordContext,
  type RecordFixAction,
} from '@/features/jobs/utils/recordDiagnosis';
import { PLATFORMS } from '@/components/platform/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SyncLogRecord } from '@/types';

export interface RecordReasonProps {
  rec: SyncLogRecord;
  context?: RecordContext;
  projectId?: string;
  jobId?: string;
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
  destination_condition: 'Matched a destination skip rule',
  api_error: 'API error',
  rate_limited: 'Rate limit reached',
  transform_error: 'Transformation failed',
  validation_error: 'Invalid field value',
  auth_error: 'Authentication error',
  network_error: 'Network error',
  unknown: 'Unknown error',
};

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

function formatErrorDetails(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : null;
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

export function RecordReason({
  rec,
  context,
  projectId: propProjectId,
  jobId: propJobId,
}: RecordReasonProps) {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string; jobId?: string }>();

  const projectId = propProjectId || params.projectId;
  const jobId = propJobId || params.jobId;

  const reason = rec.skipReason || rec.failReason;
  const detail = rec.skipReasonDetail || rec.failReasonDetail;

  if (!reason && !detail) {
    return <span className="text-muted-foreground">—</span>;
  }

  const diagnosis = analyzeRecordDiagnosis(rec, context);
  const actionLabel = rec.action === 'failed' ? 'Failed' : 'Skipped';
  const summary = getSummary(rec, reason);
  const apiDetails =
    rec.action === 'failed' ? formatErrorDetails(rec.destResponse) : null;

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
  ];

  const destinationItems: DetailItem[] = [
    ...(rec.destRecordId && context?.destObject
      ? [
          {
            label: 'Object',
            value: objectLabel(context.destPlatform, context.destObject),
          },
        ]
      : []),
    ...(rec.destRecordId ? [{ label: 'ID', value: rec.destRecordId }] : []),
  ];

  const handleActionClick = (action: RecordFixAction) => {
    if (action.destination === 'connections' && projectId) {
      navigate(`/projects/${projectId}?tab=connections`);
    } else if (action.destination === 'mapping' && projectId && jobId) {
      const q = new URLSearchParams();
      q.set('tab', 'field-mapping');
      if (action.deepLink?.field) {
        q.set('field', action.deepLink.field);
      }
      if (action.deepLink?.action) {
        q.set('action', action.deepLink.action);
      }
      navigate(`/projects/${projectId}/jobs/${jobId}?${q.toString()}`);
    }
  };

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group/reason flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 text-left"
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
        className="bg-popover text-popover-foreground border-border [&>span>svg]:bg-popover [&>span>svg]:fill-popover pointer-events-auto max-h-[min(32rem,calc(100vh-1.5rem))] w-[min(28rem,calc(100vw-1.5rem))] max-w-none items-stretch overflow-y-auto rounded-2xl border p-0 shadow-xl"
      >
        <div className="space-y-3.5 p-4">
          {/* Header */}
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
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {enumLabel(reason)}
                </p>
              )}
            </div>
          </div>

          {/* Smart Solution & Plain-English Explanation */}
          <div className="bg-muted/40 space-y-2.5 rounded-xl border p-3">
            <p className="text-foreground text-xs leading-relaxed font-medium break-words">
              {diagnosis.humanExplanation}
            </p>

            {/* 1-Click Contextual Recovery Actions with Deep Links */}
            {diagnosis.actions.length > 0 && projectId && jobId && (
              <div className="space-y-1.5 pt-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Suggested Action
                </span>
                <div className="flex flex-col gap-1.5">
                  {diagnosis.actions.map((act) => {
                    const Icon = DIAGNOSIS_ICONS[act.iconName];
                    return (
                      <Button
                        key={act.label}
                        type="button"
                        variant="secondary"
                        size="xs"
                        className="group/act hover:bg-primary/10 hover:text-primary hover:border-primary/40 flex h-7 w-full cursor-pointer items-center justify-between border px-2.5 text-xs font-medium transition-colors"
                        title={act.hint}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(act);
                        }}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Icon className="text-primary size-3.5 shrink-0" />
                          <span className="truncate">{act.label}</span>
                        </span>
                        <ArrowRight className="size-3 shrink-0 opacity-60 transition-transform group-hover/act:translate-x-0.5" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail Sections */}
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
