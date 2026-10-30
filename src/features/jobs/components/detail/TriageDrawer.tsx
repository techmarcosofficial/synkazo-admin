import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  SkipForward,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { syncLogsApi } from '@/api/syncLogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
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

import {
  analyzeRecordDiagnosis,
  DIAGNOSIS_ICONS,
  type RecordFixAction,
} from '@/features/jobs/utils/recordDiagnosis';

function readRetryError(error: unknown, fallback: string): string {
  const response = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data;
  const message = response?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return error instanceof Error ? error.message : fallback;
}

export function TriageDrawer({
  open,
  onOpenChange,
  projectId,
  jobId,
  run,
  onRefreshHistory,
}: TriageDrawerProps) {
  const { hasPermission } = useSynkazoAuth();
  const canRunJob = hasPermission('job.run');
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'failed' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryJobId, setRetryJobId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [remainingFailed, setRemainingFailed] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setRetryJobId(null);
    setRetryMessage(null);
    setRetryError(null);
    setRemainingFailed(null);
    setRetrying(false);
  }, [run?.id]);

  useEffect(() => {
    if (!open || !run) {
      setRecords([]);
      setSearchQuery('');
      return;
    }

    let isMounted = true;
    setLoading(true);

    const actionParam =
      filter === 'failed'
        ? 'failed'
        : filter === 'skipped'
          ? 'skipped'
          : undefined;

    syncLogsApi
      .listRecords(projectId, jobId, run.id, {
        action: actionParam,
        unresolvedOnly: filter === 'failed',
        limit: 100,
      })
      .then((res) => {
        if (!isMounted) return;
        setRecords(res?.data || []);
        if (typeof res?.remainingFailed === 'number')
          setRemainingFailed(res.remainingFailed);
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
  }, [open, run?.id, filter, projectId, jobId, reloadKey]);

  useEffect(() => {
    if (!retryJobId || !run) return;
    let cancelled = false;
    let inFlight = false;
    let finished = false;
    const poll = async () => {
      if (inFlight || finished) return;
      inFlight = true;
      try {
        const result = await syncLogsApi.getRetryFailedStatus(
          projectId,
          jobId,
          run.id,
          retryJobId,
        );
        if (cancelled) return;
        setRetryError(null);
        setRemainingFailed(result.remainingFailed);
        if (result.state === 'failed' || result.runStatus === 'failed') {
          finished = true;
          setRetryError(
            result.runError ||
              result.error ||
              'The retry failed. Please review the run history.',
          );
          setRetryMessage(null);
          setRetrying(false);
          setRetryJobId(null);
          setReloadKey((key) => key + 1);
          onRefreshHistory?.();
        } else if (result.state === 'completed') {
          finished = true;
          const synced = result.createdCount + result.updatedCount;
          if (result.remainingFailed > 0) {
            setRetryError(
              `${synced} record(s) synced; ${result.remainingFailed} still failed. Review the latest retry run for details.`,
            );
            setRetryMessage(null);
          } else {
            setRetryMessage(
              `${synced} record(s) synced. No failed records remain.`,
            );
          }
          setRetrying(false);
          setRetryJobId(null);
          setReloadKey((key) => key + 1);
          onRefreshHistory?.();
        }
      } catch (error) {
        if (cancelled) return;
        setRetryError(
          `${readRetryError(error, 'Could not check retry progress.')} Checking again…`,
        );
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [retryJobId, run?.id, projectId, jobId, onRefreshHistory]);

  const handleAction = async (action: RecordFixAction) => {
    if (action.destination === 'mapping') {
      onOpenChange(false);
      const q = new URLSearchParams();
      q.set('tab', 'field-mapping');
      if (action.deepLink?.field) q.set('field', action.deepLink.field);
      if (action.deepLink?.action) q.set('action', action.deepLink.action);
      navigate(`/projects/${projectId}/jobs/${jobId}?${q.toString()}`);
    } else if (action.destination === 'connections') {
      onOpenChange(false);
      navigate(`/projects/${projectId}?tab=connections`);
    } else if (action.destination === 'retry') {
      await handleRetryRun();
    }
  };

  const handleRetryRun = async () => {
    if (
      !canRunJob ||
      retrying ||
      !run ||
      (remainingFailed ?? run.failedCount ?? 0) === 0
    )
      return;
    setRetrying(true);
    setRetryError(null);
    setRetryMessage('Retrying failed records…');
    try {
      const result = await syncLogsApi.retryFailed(projectId, jobId, run.id);
      if (result.bullJobId) {
        setRetryJobId(result.bullJobId);
      } else {
        setRemainingFailed(0);
        setRetryMessage('No failed records remain to retry.');
        setReloadKey((key) => key + 1);
        setRetrying(false);
      }
    } catch (error) {
      setRetryError(readRetryError(error, 'Could not start the retry.'));
      setRetryMessage(null);
      setRetrying(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      const srcId = (r.sourceRecordId || '').toLowerCase();
      const destId = (r.destRecordId || '').toLowerCase();
      const failReason = (r.failReason || '').toLowerCase();
      const failDetail = (r.failReasonDetail || '').toLowerCase();
      const skipReason = (r.skipReason || '').toLowerCase();
      const skipDetail = (r.skipReasonDetail || '').toLowerCase();
      return (
        srcId.includes(q) ||
        destId.includes(q) ||
        failReason.includes(q) ||
        failDetail.includes(q) ||
        skipReason.includes(q) ||
        skipDetail.includes(q)
      );
    });
  }, [records, searchQuery]);

  if (!run) return null;

  const currentFailed = remainingFailed ?? run.failedCount ?? 0;
  const totalIssues = (run.failedCount || 0) + (run.skippedCount || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[540px]"
      >
        {/* Drawer Header */}
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-2xl',
                  (run.failedCount ?? 0) > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning',
                )}
              >
                <Wrench className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <SheetTitle>Triage & Recovery</SheetTitle>
                <SheetDescription className="truncate">
                  Run ID: {run.id} · {totalIssues} affected record
                  {totalIssues !== 1 ? 's' : ''}
                </SheetDescription>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {currentFailed > 0 && canRunJob && (
                <Button
                  size="sm"
                  onClick={handleRetryRun}
                  disabled={retrying}
                  aria-label={`Retry ${currentFailed} failed records`}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  {retrying ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  {retrying ? 'Retrying…' : 'Retry Failed'}
                </Button>
              )}
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close triage sidebar"
                >
                  <X className="size-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
          {retryMessage && (
            <p role="status" className="text-muted-foreground text-xs">
              {retryMessage}
            </p>
          )}
          {retryError && (
            <p role="alert" className="text-destructive text-xs">
              {retryError}
            </p>
          )}
        </SheetHeader>

        {/* Filter and Search Controls */}
        <div className="bg-muted/20 flex shrink-0 flex-col justify-between gap-2 border-b px-5 py-2.5 sm:flex-row sm:items-center">
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
                Failed ({currentFailed})
              </TabsTrigger>
              <TabsTrigger value="skipped" className="h-5 px-2 text-[11px]">
                Skipped ({run.skippedCount || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 sm:max-w-[200px]">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter records..."
              uiSize="sm"
              className="pl-7"
            />
          </div>
        </div>

        {/* Affected Records Area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="space-y-2 rounded-2xl border border-dashed p-8 text-center">
              <AlertTriangle className="text-muted-foreground mx-auto size-6 opacity-40" />
              <p className="text-foreground text-xs font-medium">
                No affected records found
              </p>
              <p className="text-muted-foreground text-[11px]">
                {searchQuery
                  ? 'No records match your search filter.'
                  : filter === 'failed'
                    ? 'No failed records remain for this run.'
                    : filter === 'skipped'
                      ? 'No skipped records in this run.'
                      : 'No affected records in this run.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRecords.map((rec) => {
                const isFailed = rec.action === 'failed' && !rec.resolved;
                const diagnosis = analyzeRecordDiagnosis(rec);

                return (
                  <div
                    key={rec.id}
                    className={cn(
                      'bg-card/60 hover:bg-card space-y-2 rounded-2xl border p-3.5 transition-colors',
                      isFailed
                        ? 'border-destructive/20 hover:border-destructive/40'
                        : 'border-warning/20 hover:border-warning/40',
                    )}
                  >
                    {/* Record Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
                        <span className="text-foreground truncate font-semibold">
                          {rec.sourceRecordId}
                        </span>
                        {rec.destRecordId && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-muted-foreground truncate">
                              {rec.destRecordId}
                            </span>
                          </>
                        )}
                      </div>

                      <Badge
                        variant="secondary"
                        tone={isFailed ? 'danger' : 'warning'}
                        className={cn(
                          'shrink-0 px-2 py-0 text-[10px] font-semibold capitalize',
                          isFailed
                            ? 'bg-destructive/10 text-destructive border-destructive/20 border'
                            : 'bg-warning/10 text-warning border-warning/20 border',
                        )}
                      >
                        {rec.resolved ? 'Recovered' : rec.action}
                      </Badge>
                    </div>

                    {/* Reason / Failure Detail */}
                    <div className="space-y-1">
                      <p className="text-foreground text-xs leading-relaxed font-medium break-words">
                        {diagnosis.humanExplanation}
                      </p>
                      {diagnosis.rawDetail && (
                        <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
                          {diagnosis.rawDetail}
                        </p>
                      )}
                    </div>

                    {/* Actionable Fix Suggestions */}
                    {diagnosis.actions.length > 0 && (
                      <div className="border-border/50 flex flex-wrap items-center gap-1.5 border-t pt-2">
                        <span className="text-muted-foreground text-[11px] font-medium">
                          Possible fixes:
                        </span>
                        {diagnosis.actions.map((fix) => {
                          const Icon = DIAGNOSIS_ICONS[fix.iconName] || Wrench;
                          return (
                            <Button
                              key={fix.label}
                              variant="outline"
                              size="xs"
                              onClick={() => handleAction(fix)}
                              title={fix.hint}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary/30 h-6 cursor-pointer gap-1 px-2 text-[11px] transition-colors"
                            >
                              <Icon className="text-primary size-3" />
                              <span>{fix.label}</span>
                              <ArrowRight className="size-2.5 opacity-60" />
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
