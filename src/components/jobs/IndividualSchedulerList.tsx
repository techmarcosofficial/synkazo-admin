import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { differenceInSeconds, format, formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Pause,
  Play,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import ListRow from '@/components/shared/list/ListRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { SchedulerJob, SchedulerRecentRun } from '@/types';

function readableCron(expr: string): string {
  if (!expr) return 'Manual only';
  const map: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 min',
    '*/15 * * * *': 'Every 15 min',
    '*/30 * * * *': 'Every 30 min',
    '0 * * * *': 'Every hour',
    '0 */2 * * *': 'Every 2 h',
    '0 */4 * * *': 'Every 4 h',
    '0 */6 * * *': 'Every 6 h',
    '0 */12 * * *': 'Every 12 h',
    '0 0 * * *': 'Daily',
    '0 0 * * 0': 'Weekly',
  };
  return map[expr] ?? expr;
}

function runDuration(run: SchedulerRecentRun): string | null {
  if (!run.startedAt) return null;
  const end = run.finishedAt ? new Date(run.finishedAt) : new Date();
  const secs = differenceInSeconds(end, new Date(run.startedAt));
  if (secs < 60) return `${secs}s`;
  return `${Math.round(secs / 60)}m`;
}

// A job's schedule is only actually running when both syncEnabled is on AND
// scheduleState isn't paused (manually or by a plan-limit pause) — mirrors
// JobDetail.tsx's handleScheduleToggle so the Scheduler page and the Job
// detail page never disagree about status. retry_pending/resume_pending are
// transitional but still schedule-driven, so they count as running.
function isScheduleRunning(job: SchedulerJob): boolean {
  return (
    !!job.syncEnabled &&
    job.scheduleState !== 'paused' &&
    job.scheduleState !== 'paused_limit_reached'
  );
}

function StatusPill({ job }: { job: SchedulerJob }) {
  if (job.isRunning)
    return (
      <Badge className="bg-muted text-muted-foreground gap-1">
        <Spinner className="text-primary size-2.5" /> Running
      </Badge>
    );
  if (!job.isEnabled) return <Badge variant="secondary">Inactive</Badge>;
  if (job.scheduleState === 'paused_limit_reached')
    return (
      <Badge className="bg-warning/10 text-warning gap-1">
        <Pause className="size-2.5" /> Plan limit reached
      </Badge>
    );
  if (!isScheduleRunning(job))
    return (
      <Badge className="bg-muted text-muted-foreground gap-1">
        <Pause className="text-warning size-2.5" /> Paused
      </Badge>
    );
  return (
    <Badge className="bg-muted text-muted-foreground gap-1">
      <Play className="text-success size-2.5" /> Scheduled
    </Badge>
  );
}

const RUN_STATUS_DOT: Record<string, string> = {
  completed: 'bg-success',
  failed: 'bg-destructive',
  cancelled: 'bg-warning',
  running: 'bg-primary',
};

// `triggeredBy` is a raw backend enum-ish string — "cron", "limit_sync", or a
// "manual:<userId>" composite. Rendered as-is that composite printed a UUID where a short
// human label belongs; this maps it down to what the user actually needs to see.
function triggerLabel(triggeredBy?: string): string {
  if (!triggeredBy) return '—';
  if (triggeredBy === 'cron') return 'Scheduled';
  if (triggeredBy === 'limit_sync') return 'Custom Sync';
  if (triggeredBy.startsWith('manual')) return 'Manual';
  return triggeredBy;
}

function RunHistory({ runs }: { runs?: SchedulerRecentRun[] }) {
  if (!runs?.length)
    return <p className="text-muted-foreground py-1 text-xs">No runs yet.</p>;

  return (
    <div>
      {runs.map((run) => (
        <ListRow key={run.id} className="gap-2 text-xs">
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              RUN_STATUS_DOT[run.status] ?? 'bg-muted-foreground',
            )}
          />
          <span className="text-muted-foreground w-28 shrink-0 font-mono">
            {format(new Date(run.startedAt), 'MMM d HH:mm')}
          </span>
          <span className="w-20 shrink-0" title={run.triggeredBy}>
            {triggerLabel(run.triggeredBy)}
          </span>
          <span className="text-success ml-auto">
            {run.recordsProcessed} records
          </span>
          {(run.errorCount ?? 0) > 0 && (
            <span className="text-destructive">{run.errorCount} err</span>
          )}
          <span className="text-muted-foreground w-8 text-right">
            {runDuration(run)}
          </span>
        </ListRow>
      ))}
    </div>
  );
}

interface JobCardProps {
  job: SchedulerJob & { recentRuns?: SchedulerRecentRun[] };
  index: number;
  projectId: string;
  rank: number;
  onRefresh: () => void;
}

function JobCard({ job, index, projectId, rank, onRefresh }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const running = isScheduleRunning(job);

  const handleSyncToggle = async () => {
    setToggling(true);
    try {
      if (running) {
        await jobsApi.pauseSchedule(projectId, job.id);
        toast.success('Schedule paused. Runs will not fire until resumed.');
      } else if (
        job.scheduleState === 'paused' ||
        job.scheduleState === 'paused_limit_reached'
      ) {
        await jobsApi.resumeSchedule(projectId, job.id);
        toast.success('Schedule resumed — catching up on missed changes.');
      } else {
        await jobsApi.setSyncEnabled(projectId, job.id, true);
        toast.success(
          'Schedule started — sync will run per configured interval.',
        );
      }
      onRefresh();
    } catch {
      toast.error('Failed to update job');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'gap-0 overflow-hidden py-0',
            snapshot.isDragging && 'ring-paused/40 ring-2',
          )}
          style={provided.draggableProps.style}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              {...provided.dragHandleProps}
              className="text-muted-foreground shrink-0 cursor-grab"
            >
              <GripVertical className="size-4" />
            </div>

            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
              {rank}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {job.name}
                </span>
                <StatusPill job={job} />
              </div>
              <div className="text-muted-foreground mt-0.5 flex gap-1 truncate text-xs">
                <span>{job.sourceObject}</span>
                <ArrowRight size={15} />
                <span>{job.destObject}</span>
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                {job.lastSyncedAt && (
                  <span>
                    Last:{' '}
                    {formatDistanceToNow(new Date(job.lastSyncedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                {job.nextRunAt &&
                  running &&
                  !job.isRunning &&
                  new Date(job.nextRunAt) > new Date() && (
                    <span>
                      Next:{' '}
                      {formatDistanceToNow(new Date(job.nextRunAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-1 text-xs">
                <Clock className="size-2.5" />
                {job.syncDirection === 'two_way'
                  ? 'Auto · ~2 min'
                  : readableCron(job.cronExpression ?? '')}
              </span>
              {job.isEnabled && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSyncToggle}
                  disabled={toggling || job.isRunning}
                  className={cn(running ? 'text-warning' : 'text-success')}
                >
                  {toggling ? <Spinner /> : running ? <Pause /> : <Play />}
                  {running ? 'Pause' : 'Resume'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="border-t p-3">
              <div className="overflow-hidden rounded-4xl border">
                <div className="bg-muted px-4 py-3">
                  <p className="text-xs font-semibold tracking-wider uppercase">
                    Recent Runs
                  </p>
                </div>
                <RunHistory runs={job.recentRuns} />
              </div>
            </div>
          )}
        </Card>
      )}
    </Draggable>
  );
}

export default function IndividualSchedulerList({
  projectId,
}: {
  projectId: string;
}) {
  const [jobs, setJobs] = useState<
    (SchedulerJob & { recentRuns?: SchedulerRecentRun[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const data = await jobsApi.getSchedulerView(projectId);
        setJobs(Array.isArray(data) ? data : (data as any).jobs);
        setDirty(false);
      } catch {
        toast.error('Failed to load scheduler');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(jobs);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setJobs(reordered);
    setDirty(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const updates = jobs.map((job, i) => ({ id: job.id, priority: i + 1 }));
      await jobsApi.updatePriorities(projectId, updates);
      toast.success('Execution order saved');
      setDirty(false);
      load(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="text-paused size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn(refreshing && 'animate-spin')} />
          Refresh
        </Button>
        {dirty && (
          <Button
            size="sm"
            className="bg-paused hover:bg-paused/90"
            onClick={saveOrder}
            disabled={saving}
          >
            {saving ? <Spinner /> : <Save />}
            {saving ? 'Saving…' : 'Save Order'}
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="mb-1 text-sm font-medium">No jobs yet</p>
            <p className="text-muted-foreground text-xs">
              Create jobs in the Jobs tab — they will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="scheduler">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {jobs.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    rank={i + 1}
                    projectId={projectId}
                    onRefresh={() => load(true)}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
