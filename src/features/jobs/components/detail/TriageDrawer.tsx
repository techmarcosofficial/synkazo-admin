import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi } from '@/api/syncLogs';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import { cn } from '@/lib/utils';
import type { SyncLogRecord } from '@/types';

export interface TriageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  jobId: string;
  run: ExtSyncRun | null;
  onRefreshHistory?: () => void;
}

interface DiagnosisGroup {
  id: string;
  title: string;
  severity: 'destructive' | 'warning' | 'info';
  count: number;
  whatHappened: string;
  why: string;
  recommendedAction: string;
  actionLabel: string;
  actionDestination: 'mapping' | 'connections' | 'retry';
}

export function TriageDrawer({
  open,
  onOpenChange,
  projectId,
  jobId,
  run,
  onRefreshHistory,
}: TriageDrawerProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'failed' | 'skipped'>('all');
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!open || !run) {
      setRecords([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const actionParam =
      filter === 'failed' ? 'failed' : filter === 'skipped' ? 'skipped' : undefined;

    syncLogsApi
      .listRecords(projectId, jobId, run.id, {
        action: actionParam,
        limit: 50,
      })
      .then((res) => {
        if (!isMounted) return;
        setRecords(res?.data || []);
      })
      .catch(() => {
        if (!isMounted) return;
        toast.error('Could not load record details for this run.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, run, filter, projectId, jobId]);

  // Analyze records to produce intelligent root-cause diagnosis buckets
  const diagnoses = useMemo<DiagnosisGroup[]>(() => {
    if (!run) return [];

    const groups: DiagnosisGroup[] = [];
    const runErrMsg = (run.errorMessage || '').toLowerCase();

    // 1. Expired Credentials / Authentication Failure
    const authExpiredRecords = records.filter(
      (r) =>
        r.failReason === 'auth_failed' ||
        r.failReason === 'unauthorized' ||
        (r.failReasonDetail &&
          (r.failReasonDetail.toLowerCase().includes('401') ||
            r.failReasonDetail.toLowerCase().includes('unauthorized') ||
            r.failReasonDetail.toLowerCase().includes('token expired'))),
    );
    const hasAuthExpiredError =
      runErrMsg.includes('unauthorized') ||
      runErrMsg.includes('token expired') ||
      runErrMsg.includes('invalid credentials') ||
      runErrMsg.includes('401');

    if (authExpiredRecords.length > 0 || hasAuthExpiredError) {
      groups.push({
        id: 'auth-expired',
        title: 'Expired Credentials / Authentication Failure',
        severity: 'destructive',
        count: authExpiredRecords.length || 1,
        whatHappened:
          'The external platform rejected authentication for this sync request.',
        why: 'The OAuth token expired, API key was regenerated, or account permissions were revoked.',
        recommendedAction:
          'Reconnect the platform in Connections to restore valid access.',
        actionLabel: 'Reconnect in Connections',
        actionDestination: 'connections',
      });
    }

    // 2. Insufficient Permissions / Missing Scope
    const authForbiddenRecords = records.filter(
      (r) =>
        r.failReason === 'forbidden' ||
        r.failReason === 'missing_scope' ||
        (r.failReasonDetail &&
          (r.failReasonDetail.toLowerCase().includes('403') ||
            r.failReasonDetail.toLowerCase().includes('forbidden') ||
            r.failReasonDetail.toLowerCase().includes('scope'))),
    );
    const hasForbiddenError =
      runErrMsg.includes('forbidden') ||
      runErrMsg.includes('missing scope') ||
      runErrMsg.includes('403');

    if (authForbiddenRecords.length > 0 || hasForbiddenError) {
      groups.push({
        id: 'auth-forbidden',
        title: 'Insufficient Permissions / Missing Scope',
        severity: 'destructive',
        count: authForbiddenRecords.length || 1,
        whatHappened:
          'The connected platform account does not have write or read permissions for this object.',
        why: 'The API user lacks required scopes or administrator rights in the external platform.',
        recommendedAction:
          'Grant the necessary permissions on the platform, then verify the connection.',
        actionLabel: 'Review in Connections',
        actionDestination: 'connections',
      });
    }

    // 3. Missing Required Values
    const missingFieldRecords = records.filter(
      (r) =>
        r.failReason === 'missing_required_field' ||
        r.skipReason === 'missing_required_field' ||
        (r.failReasonDetail &&
          r.failReasonDetail.toLowerCase().includes('required')),
    );
    const runFailedCount = run.failedCount ?? 0;
    if (
      missingFieldRecords.length > 0 ||
      (runFailedCount > 0 &&
        records.length === 0 &&
        !hasAuthExpiredError &&
        !hasForbiddenError)
    ) {
      groups.push({
        id: 'missing-field',
        title: 'Missing Required Values',
        severity: 'destructive',
        count: missingFieldRecords.length || runFailedCount,
        whatHappened:
          'Destination requires a value, but the source field was empty on these records.',
        why: 'The destination schema requires mandatory fields that were not populated in the source.',
        recommendedAction:
          'Set a fallback default value in Field Mapping so records can be created safely.',
        actionLabel: 'Configure Fallback in Field Mapping',
        actionDestination: 'mapping',
      });
    }

    // 4. Platform API Rate Limit Exceeded
    const rateLimitRecords = records.filter(
      (r) =>
        r.failReason === 'rate_limited' ||
        r.failReason === 'too_many_requests' ||
        (r.failReasonDetail &&
          (r.failReasonDetail.toLowerCase().includes('429') ||
            r.failReasonDetail.toLowerCase().includes('rate limit'))),
    );
    const hasRateLimitError =
      runErrMsg.includes('rate limit') || runErrMsg.includes('429');

    if (rateLimitRecords.length > 0 || hasRateLimitError) {
      groups.push({
        id: 'rate-limit',
        title: 'Platform API Rate Limit Exceeded',
        severity: 'warning',
        count: rateLimitRecords.length || 1,
        whatHappened:
          'The external platform temporarily throttled requests due to API volume quota.',
        why: 'High burst volume exceeded the external vendor’s hourly or per-second rate limits.',
        recommendedAction:
          'Wait a moment for the window to reset, then retry failed records.',
        actionLabel: 'Retry Failed Records Now',
        actionDestination: 'retry',
      });
    }

    // 5. Network Timeout / Connection Dropped
    const timeoutRecords = records.filter(
      (r) =>
        r.failReason === 'network_error' ||
        r.failReason === 'network_timeout' ||
        (r.failReasonDetail &&
          (r.failReasonDetail.toLowerCase().includes('timeout') ||
            r.failReasonDetail.toLowerCase().includes('econnreset') ||
            r.failReasonDetail.toLowerCase().includes('etimedout'))),
    );
    const hasTimeoutError =
      runErrMsg.includes('timeout') ||
      runErrMsg.includes('econnreset') ||
      runErrMsg.includes('etimedout');

    if (timeoutRecords.length > 0 || hasTimeoutError) {
      groups.push({
        id: 'network-timeout',
        title: 'Network Connection Timeout',
        severity: 'warning',
        count: timeoutRecords.length || 1,
        whatHappened:
          'The network connection timed out while waiting for a response from the platform.',
        why: 'Temporary network congestion or transient external server delay.',
        recommendedAction:
          'Progress was preserved up to the last batch; retry to resume cleanly.',
        actionLabel: 'Retry Failed Records Now',
        actionDestination: 'retry',
      });
    }

    // 6. External Platform Server Error (5xx)
    const serverErrorRecords = records.filter(
      (r) =>
        r.failReason === 'api_error' ||
        r.failReason === 'server_error' ||
        (r.failReasonDetail &&
          (r.failReasonDetail.toLowerCase().includes('500') ||
            r.failReasonDetail.toLowerCase().includes('502') ||
            r.failReasonDetail.toLowerCase().includes('503'))),
    );
    const hasServerError =
      runErrMsg.includes('500') ||
      runErrMsg.includes('502') ||
      runErrMsg.includes('503') ||
      runErrMsg.includes('server error') ||
      runErrMsg.includes('bad gateway');

    if (serverErrorRecords.length > 0 || hasServerError) {
      groups.push({
        id: 'server-outage',
        title: 'External Platform Server Error (5xx)',
        severity: 'destructive',
        count: serverErrorRecords.length || 1,
        whatHappened:
          'The external platform returned an internal server error (HTTP 500, 502, or 503).',
        why: 'The external vendor is experiencing temporary service disruptions or maintenance.',
        recommendedAction:
          'Check vendor status and retry once platform availability stabilizes.',
        actionLabel: 'Retry Sync Run',
        actionDestination: 'retry',
      });
    }

    // 7. Unique Match Identifier Conflict
    const idMatchRecords = records.filter(
      (r) =>
        r.failReason === 'no_id_match' ||
        r.skipReason === 'no_id_match' ||
        r.failReason === 'duplicate' ||
        r.skipReason === 'duplicate' ||
        r.failReason === 'id_conflict',
    );
    if (idMatchRecords.length > 0) {
      groups.push({
        id: 'id-match',
        title: 'Unique Match Identifier Conflicts',
        severity: 'warning',
        count: idMatchRecords.length,
        whatHappened:
          'Records could not be matched with existing destination records, or an identifier conflict was detected.',
        why: 'Ambiguous or conflicting match criteria (e.g. shared emails or duplicate IDs).',
        recommendedAction:
          'Review your Unique Identifier (Match Field) configuration in Field Mapping.',
        actionLabel: 'Review Identifier Mapping',
        actionDestination: 'mapping',
      });
    }

    // 8. Excluded by Filter / Skip Rules
    const filterExcludedRecords = records.filter(
      (r) =>
        r.skipReason === 'filter_excluded' ||
        r.skipReason === 'manually_excluded' ||
        r.skipReason === 'matched_no_update',
    );
    if (filterExcludedRecords.length > 0) {
      groups.push({
        id: 'filter-excluded',
        title: 'Excluded by Filter / Skip Rules',
        severity: 'info',
        count: filterExcludedRecords.length,
        whatHappened:
          'These records were evaluated and safely excluded from synchronization.',
        why: 'The records matched your configured Skip Record conditions (e.g. test data, inactive status).',
        recommendedAction:
          'If you want these records synced, review or edit the skip rules in Field Mapping.',
        actionLabel: 'Review Skip Rules',
        actionDestination: 'mapping',
      });
    }

    return groups;
  }, [run, records]);

  const handleAction = async (diag: DiagnosisGroup) => {
    if (diag.actionDestination === 'mapping') {
      onOpenChange(false);
      navigate(`/projects/${projectId}/jobs/${jobId}?tab=field-mapping`);
    } else if (diag.actionDestination === 'connections') {
      onOpenChange(false);
      navigate(`/projects/${projectId}?tab=connections`);
    } else if (diag.actionDestination === 'retry') {
      await handleRetryRun();
    }
  };

  const handleRetryRun = async () => {
    setRetrying(true);
    try {
      await jobsApi.runJob(projectId, jobId);
      toast.success('Retry sync started successfully');
      onRefreshHistory?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to trigger retry run. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  if (!run) return null;

  const totalIssues = (run.failedCount || 0) + (run.skippedCount || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-xl md:max-w-2xl p-0"
      >
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <Wrench className="size-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold">
                  Triage & Recovery
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Run ID: {run.id} · {totalIssues} issue{totalIssues !== 1 ? 's' : ''} detected
                </SheetDescription>
              </div>
            </div>
            {(run.failedCount ?? 0) > 0 && (
              <Button
                size="sm"
                onClick={handleRetryRun}
                disabled={retrying}
                className="gap-1.5 text-xs"
              >
                {retrying ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Retry Failed Records
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Diagnostic Root Cause Cards */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CircleAlert className="size-3.5 text-primary" />
              Root Cause Diagnosis
            </h4>

            {diagnoses.length === 0 ? (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      No critical blockers identified
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All processed records succeeded cleanly in this run.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {diagnoses.map((diag) => (
                  <Card
                    key={diag.id}
                    className={cn(
                      'border-l-4 p-4',
                      diag.severity === 'destructive'
                        ? 'border-l-destructive border-destructive/20 bg-destructive/5'
                        : diag.severity === 'warning'
                          ? 'border-l-warning border-warning/20 bg-warning/5'
                          : 'border-l-info border-info/20 bg-info/5',
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {diag.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            diag.severity === 'destructive'
                              ? 'bg-destructive/10 text-destructive'
                              : diag.severity === 'warning'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-info/10 text-info',
                          )}
                        >
                          {diag.count} record{diag.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs leading-relaxed">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">What happened: </span>
                          {diag.whatHappened}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Why: </span>
                          {diag.why}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
                        <p className="text-[11px] font-medium text-foreground">
                          💡 {diag.recommendedAction}
                        </p>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleAction(diag)}
                          className="gap-1 text-xs"
                        >
                          {diag.actionLabel}
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Record Level Detail Table */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Filter className="size-3.5 text-primary" />
                Affected Records
              </h4>

              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as 'all' | 'failed' | 'skipped')}
                className="w-auto"
              >
                <TabsList className="h-7 text-xs">
                  <TabsTrigger value="all" className="h-5 px-2 text-[11px]">
                    All ({totalIssues})
                  </TabsTrigger>
                  <TabsTrigger value="failed" className="h-5 px-2 text-[11px]">
                    Failed ({run.failedCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="skipped" className="h-5 px-2 text-[11px]">
                    Skipped ({run.skippedCount || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No records found matching the current filter.
              </p>
            ) : (
              <div className="rounded-3xl border overflow-hidden bg-card">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                          Source Record ID
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                          Reason / Root Cause
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {records.map((rec) => {
                        const isFailed = rec.action === 'failed';
                        const reasonText =
                          rec.failReasonDetail ||
                          rec.failReason ||
                          rec.skipReasonDetail ||
                          rec.skipReason ||
                          'Excluded by filter';

                        return (
                          <tr key={rec.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono font-medium">
                              {rec.sourceRecordId}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 capitalize',
                                  isFailed
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-warning/10 text-warning',
                                )}
                              >
                                {rec.action}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={reasonText}>
                              {reasonText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
