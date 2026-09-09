import { format } from 'date-fns';
import { AlertCircle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useProjectDetailContext } from '../context';

import type { ActivityLog } from '@/api/activity';
import { PlatformIcon } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHeaderPrimaryAction } from '@/hooks/useHeaderPrimaryAction';
import { cn } from '@/lib/utils';
import { useProjectActivityQuery } from '@/queries/useActivity';

const PAGE_SIZE_OPTIONS = [20, 30, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'sb_activity_page_size';

function readStoredPageSize(): number {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : 20;
  } catch {
    return 20;
  }
}

function statusFor(log: ActivityLog): string {
  if (log.metadata?.status) return log.metadata.status;
  if (log.level === 'success') return 'success';
  if (log.level === 'error') return 'failed';
  if (log.level === 'warn') return 'partial';
  return 'pending';
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDuration(ms?: number | null): string {
  if (ms == null) return '—';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export default function ActivityTab() {
  const { projectId, project, jobs } = useProjectDetailContext();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(readStoredPageSize);

  const query = useProjectActivityQuery(projectId, page, limit);
  const res = query.data;
  const logs = res?.data ?? [];
  const total = res?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useHeaderPrimaryAction({
    label: 'Refresh',
    icon: RefreshCw,
    onClick: () => query.refetch(),
    loading: query.isFetching,
  });

  function handleLimitChange(next: number) {
    setLimit(next);
    setPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
    } catch {
      // localStorage unavailable (e.g. private browsing) — selection just won't persist
    }
  }

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync activity</CardTitle>
          <CardDescription>
            A complete history of sync runs for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-3xl border">
            <SkeletonTable rows={8} columns={7} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (query.isError && !res) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync activity</CardTitle>
          <CardDescription>
            A complete history of sync runs for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={() => query.refetch()} />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync activity</CardTitle>
          <CardDescription>
            A complete history of sync runs for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border">
            <EmptyState
              icon={AlertCircle}
              title="No sync activity yet"
              description="When a sync job runs, its status, record counts, and timing will appear here."
              viewMode="table"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Sync activity</CardTitle>
          <CardDescription>
            Review each sync run, its outcome, and the records it processed.
          </CardDescription>
        </div>
        <p className="text-muted-foreground shrink-0 text-sm">
          {total.toLocaleString()} sync event{total !== 1 ? 's' : ''}
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-3xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted/50">
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Synced</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const jobName =
                  log.metadata?.jobName ??
                  jobs.find((j) => j.id === log.jobId)?.name ??
                  'Sync run';
                const sourcePlatformId =
                  log.metadata?.sourcePlatformId ?? project.sourcePlatformId;
                const destPlatformId =
                  log.metadata?.destPlatformId ?? project.destPlatformId;
                const entity =
                  log.metadata?.sourceObject && log.metadata?.destObject
                    ? `${titleCase(log.metadata.sourceObject)} → ${titleCase(log.metadata.destObject)}`
                    : jobName;
                const completedAt = log.createdAt
                  ? new Date(log.createdAt)
                  : null;
                const startedAt =
                  completedAt && log.durationMs != null
                    ? new Date(completedAt.getTime() - log.durationMs)
                    : completedAt;
                const failed = log.metadata?.recordsFailed;

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <StatusBadge status={statusFor(log)} size="sm" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <span
                        className="block max-w-52 truncate"
                        title={log.message}
                      >
                        {entity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sourcePlatformId ? (
                        <PlatformIcon
                          platformId={sourcePlatformId}
                          variant="icon-text"
                          size="sm"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {destPlatformId ? (
                        <PlatformIcon
                          platformId={destPlatformId}
                          variant="icon-text"
                          size="sm"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {log.recordsProcessed ?? 0}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-xs',
                        !!failed && 'text-destructive',
                      )}
                    >
                      {failed ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDuration(log.durationMs)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {startedAt ? format(startedAt, 'MMM d, HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {completedAt ? format(completedAt, 'MMM d, HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.jobId ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to={`/projects/${projectId}/jobs/${log.jobId}?tab=run-history`}
                            state={{
                              jobBackTo: `/projects/${projectId}?tab=activity`,
                              jobBackLabel: 'Back to Project Activity',
                            }}
                          >
                            View <ArrowUpRight />
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </CardFooter>
    </Card>
  );
}
