import { formatDistanceToNowStrict, format } from 'date-fns';
import { ArrowRight, ArrowUp } from 'lucide-react';

import { useJobDetailContext } from '../context';

import ListRow from '@/components/shared/list/ListRow';
import StatCardGrid from '@/components/shared/StatCardGrid';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import { formatNum } from '@/features/jobs/utils';

// --- local helpers -----------------------------------------------------

function formatDuration(seconds?: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const TRIGGER_LABELS: Record<string, string> = {
  cron: 'Scheduled',
  manual: 'Manual',
  api: 'API',
  resume: 'Resumed',
  sync_all: 'Sync All',
  limit_sync: 'Custom Sync',
  webhook: 'Webhook',
};

function getScheduleLabel(job: {
  scheduleMode?: string | null;
  intervalMinutes?: number | null;
  cronExpression?: string | null;
}) {
  if (job.scheduleMode) {
    const map: Record<string, string> = {
      daily_time: 'Daily Time',
      interval: `Every ${job.intervalMinutes ?? '?'} min`,
      day_specific: 'Day Specific',
    };
    return map[job.scheduleMode] ?? job.scheduleMode;
  }
  if (job.cronExpression) return job.cronExpression;
  return 'Manual';
}

function getMatchField(
  job: {
    idMappingDestField?: string | null;
    idMappingSourceField?: string | null;
  },
  mappings?: {
    sourceField: string;
    matchDestKey?: string | null;
  }[],
) {
  const matched = mappings?.find((m) => m.matchDestKey);
  if (matched) return matched.matchDestKey ?? matched.sourceField;
  return job.idMappingDestField || job.idMappingSourceField || '—';
}

// -------------------------------------------------------------------------

export default function OverviewTab() {
  const { job, runLogs, jobFieldMappings, handleTabChange } =
    useJobDetailContext();

  const finishedRuns: ExtSyncRun[] = (runLogs ?? []).filter(
    (r) => r.status && r.status !== 'running' && r.status !== 'queued',
  );
  const successCount = finishedRuns.filter(
    (r) => r.status === 'completed' || r.status === 'success',
  ).length;
  const successRate = finishedRuns.length
    ? (successCount / finishedRuns.length) * 100
    : null;

  // durationMs is what the API actually returns (see ExtSyncRun) — formatDuration takes
  // seconds, so this converts rather than reading fields that don't exist on the response.
  const durations = finishedRuns
    .map((r) => r.durationMs)
    .filter((ms): ms is number => typeof ms === 'number')
    .map((ms) => ms / 1000);
  const avgDuration = durations.length
    ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
    : null;

  const recentRuns: ExtSyncRun[] = (runLogs ?? []).slice(0, 5);
  return (
    <div className="space-y-4">
      <StatCardGrid
        columns={4}
        stats={[
          {
            label: 'Records synced',
            value: formatNum(job.recordsSynced),
            tone: 'text-primary',
          },
          {
            label: 'Success rate',
            value: successRate != null ? `${successRate.toFixed(1)}%` : '—',
            tone: 'text-success',
          },
          {
            label: 'Avg duration',
            value: formatDuration(avgDuration),
            tone: 'text-info',
          },
          {
            label: 'Since last run',
            value: job.lastSyncedAt
              ? formatDistanceToNowStrict(new Date(job.lastSyncedAt))
              : 'Never',
            tone: 'text-muted-foreground',
          },
        ]}
      />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent runs */}
          <Card className="gap-0 border py-0 lg:col-span-2">
            <CardContent className="p-0">
              <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
                <h3 className="text-lg font-semibold">Recent runs</h3>
                <Button
                  variant="link"
                  type="button"
                  onClick={() => handleTabChange('run-history')}
                  className="h-auto p-0"
                >
                  View all
                  <ArrowRight />
                </Button>
              </div>
              {recentRuns.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No runs yet
                </p>
              ) : (
                <div>
                  {recentRuns.map((run) => (
                    <ListRow key={run.id} className="justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={run.status} />
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px]"
                        >
                          {(run.triggeredBy &&
                            TRIGGER_LABELS[run.triggeredBy]) ??
                            'Scheduled'}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {run.startedAt
                            ? format(new Date(run.startedAt), 'MMM d, HH:mm')
                            : '—'}
                          {' · '}
                          {formatDuration(
                            typeof run.durationMs === 'number'
                              ? run.durationMs / 1000
                              : null,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-success">
                          +{formatNum(run.createdCount ?? 0)}
                        </span>
                        <span className="text-info inline-flex items-center">
                          <ArrowUp className="size-3" />
                          {formatNum(run.updatedCount ?? 0)}
                        </span>
                      </div>
                    </ListRow>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rule details */}
          <Card className="gap-0 border py-0">
            <CardContent className="p-0">
              <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
                <h3 className="text-lg font-semibold">Rule details</h3>
              </div>
              {[
                [
                  'Direction',
                  job.syncDirection === 'one_way' ? 'One-way →' : 'Two-way ↔',
                ],
                [
                  'Records',
                  job.syncTrigger === 'both'
                    ? 'New & Updated'
                    : job.syncTrigger === 'new'
                      ? 'New Records'
                      : job.syncTrigger === 'updated'
                        ? 'Updated Records'
                        : (job.syncTrigger ?? '—'),
                ],
                ['Match field', getMatchField(job, jobFieldMappings)],
                ['Schedule', getScheduleLabel(job)],
                ['Source of truth', job.sourceOfTruth ?? '—'],
                ['Priority', job.priority ?? '—'],
                ...(job.dependsOnJobId
                  ? [['Runs after', job.dependsOnJobId]]
                  : []),
              ].map(([k, v]) => (
                <ListRow key={k} className="justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v || '—'}</span>
                </ListRow>
              ))}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
