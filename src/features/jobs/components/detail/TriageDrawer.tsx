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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi } from '@/api/syncLogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface FixSuggestion {
  label: string;
  destination: 'mapping' | 'connections' | 'retry';
  icon?: LucideIcon;
  hint: string;
}

function getRecordFixSuggestions(rec: SyncLogRecord): FixSuggestion[] {
  const suggestions: FixSuggestion[] = [];
  const text =
    `${rec.failReason || ''} ${rec.failReasonDetail || ''} ${rec.skipReason || ''} ${rec.skipReasonDetail || ''}`.toLowerCase();

  const isAuth =
    text.includes('auth') ||
    text.includes('unauthorized') ||
    text.includes('401') ||
    text.includes('token') ||
    text.includes('credential');
  const isForbidden =
    text.includes('forbidden') ||
    text.includes('scope') ||
    text.includes('403') ||
    text.includes('permission');
  const isMissingField =
    text.includes('required') ||
    text.includes('missing') ||
    rec.failReason === 'missing_required_field' ||
    rec.skipReason === 'missing_required_field';
  const isValidationOrTransform =
    text.includes('invalid') ||
    text.includes('validation') ||
    text.includes('transform') ||
    text.includes('format') ||
    text.includes('type') ||
    text.includes('parse');
  const isDuplicateOrIdMatch =
    text.includes('duplicate') ||
    text.includes('match') ||
    text.includes('conflict') ||
    rec.failReason === 'no_id_match' ||
    rec.failReason === 'id_conflict';
  const isRateLimitOrTimeout =
    text.includes('rate limit') ||
    text.includes('429') ||
    text.includes('timeout') ||
    text.includes('500') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('econnreset') ||
    text.includes('network');

  if (isAuth || isForbidden) {
    suggestions.push({
      label: 'Reconnect in Connections',
      destination: 'connections',
      icon: ExternalLink,
      hint: 'Update credentials or grant required scopes',
    });
  }

  if (isMissingField) {
    suggestions.push({
      label: 'Default fallback value',
      destination: 'mapping',
      icon: Wrench,
      hint: 'Provide a fallback value when source field is empty',
    });
    suggestions.push({
      label: 'Skip rule suggestion',
      destination: 'mapping',
      icon: SkipForward,
      hint: 'Exclude records missing this field from syncing',
    });
  } else if (isValidationOrTransform) {
    suggestions.push({
      label: 'Rule suggestion (Transform)',
      destination: 'mapping',
      icon: Wrench,
      hint: 'Format or clean values before sending to destination',
    });
    suggestions.push({
      label: 'Default mapping suggestion',
      destination: 'mapping',
      icon: Wrench,
      hint: 'Adjust target field mapping or fallback',
    });
  } else if (isDuplicateOrIdMatch) {
    suggestions.push({
      label: 'Review Match Identifier',
      destination: 'mapping',
      icon: Wrench,
      hint: 'Check unique identifier mapping to prevent collisions',
    });
    suggestions.push({
      label: 'Skip duplicate rule',
      destination: 'mapping',
      icon: SkipForward,
      hint: 'Add skip condition to ignore duplicate records',
    });
  } else if (isRateLimitOrTimeout) {
    suggestions.push({
      label: 'Retry record now',
      destination: 'retry',
      icon: RotateCcw,
      hint: 'Transient error — safe to retry',
    });
  } else {
    // General fallback suggestions for failed or skipped records
    if (rec.action === 'failed') {
      suggestions.push({
        label: 'Default mapping suggestion',
        destination: 'mapping',
        icon: Wrench,
        hint: 'Inspect or adjust field mapping fallback',
      });
      suggestions.push({
        label: 'Skip rule suggestion',
        destination: 'mapping',
        icon: SkipForward,
        hint: 'Exclude this record pattern if not needed',
      });
    } else {
      suggestions.push({
        label: 'Review Skip Rules',
        destination: 'mapping',
        icon: SkipForward,
        hint: 'Inspect skip conditions in Field Mapping',
      });
    }
  }

  return suggestions;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

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
        limit: 100,
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

  const handleAction = async (
    destination: 'mapping' | 'connections' | 'retry',
  ) => {
    if (destination === 'mapping') {
      onOpenChange(false);
      navigate(`/projects/${projectId}/jobs/${jobId}?tab=field-mapping`);
    } else if (destination === 'connections') {
      onOpenChange(false);
      navigate(`/projects/${projectId}?tab=connections`);
    } else if (destination === 'retry') {
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

  const totalIssues = (run.failedCount || 0) + (run.skippedCount || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[540px]"
      >
        {/* Drawer Header */}
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
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

            {(run.failedCount ?? 0) > 0 && (
              <Button
                size="sm"
                onClick={handleRetryRun}
                disabled={retrying}
                className="shrink-0 gap-1.5 text-xs"
              >
                {retrying ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Retry Failed
              </Button>
            )}
          </div>
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
                Failed ({run.failedCount || 0})
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
                  : 'All processed records succeeded cleanly in this run.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRecords.map((rec) => {
                const isFailed = rec.action === 'failed';
                const reasonText =
                  rec.failReasonDetail ||
                  rec.failReason ||
                  rec.skipReasonDetail ||
                  rec.skipReason ||
                  (isFailed
                    ? 'Record processing failed'
                    : 'Excluded by sync rule');
                const fixes = getRecordFixSuggestions(rec);

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
                        className={cn(
                          'shrink-0 px-2 py-0 text-[10px] font-semibold capitalize',
                          isFailed
                            ? 'bg-destructive/10 text-destructive border-destructive/20 border'
                            : 'bg-warning/10 text-warning border-warning/20 border',
                        )}
                      >
                        {rec.action}
                      </Badge>
                    </div>

                    {/* Reason / Failure Detail */}
                    <p className="text-muted-foreground text-xs leading-relaxed break-words">
                      {reasonText}
                    </p>

                    {/* Actionable Fix Suggestions */}
                    {fixes.length > 0 && (
                      <div className="border-border/50 flex flex-wrap items-center gap-1.5 border-t pt-2">
                        <span className="text-muted-foreground text-[11px] font-medium">
                          Possible fixes:
                        </span>
                        {fixes.map((fix) => {
                          const Icon = fix.icon ?? Wrench;
                          return (
                            <Button
                              key={fix.label}
                              variant="outline"
                              size="xs"
                              onClick={() => handleAction(fix.destination)}
                              title={fix.hint}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary/30 h-6 gap-1 px-2 text-[11px] transition-colors"
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
