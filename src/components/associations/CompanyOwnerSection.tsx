import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Play,
  RefreshCw,
  SkipForward,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { type CompanyOwnerRunLog } from '@/api/associations';
import DataformaOwnerMappingsEditor from '@/components/associations/DataformaOwnerMappingsEditor';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListRow from '@/components/shared/list/ListRow';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import {
  useCompanyOwnerLogsQuery,
  useCompanyOwnerResultsQuery,
  useRunAllCompanyOwnersMutation,
} from '@/queries/useAssociations';

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-success',
  partial: 'bg-warning',
  failed: 'bg-destructive',
};

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge className="bg-muted text-muted-foreground gap-1.5 capitalize">
      <span
        className={cn(
          'size-1.5 rounded-full',
          STATUS_DOT[status] ?? STATUS_DOT.partial,
        )}
      />
      {status}
    </Badge>
  );
}

const RESULT_STATUS_META: Record<
  string,
  { label: string; icon: typeof Check; className: string }
> = {
  success: { label: 'Associated', icon: Check, className: 'text-success' },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className: 'text-muted-foreground',
  },
  failed: { label: 'Failed', icon: X, className: 'text-destructive' },
};

function ResultStatusBadge({ status }: { status: string }) {
  const meta = RESULT_STATUS_META[status] ?? RESULT_STATUS_META.failed;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn('gap-1', meta.className)}>
      <Icon className="size-3" /> {meta.label}
    </Badge>
  );
}

function RunLogRow({
  log,
  selected,
  onClick,
}: {
  log: CompanyOwnerRunLog;
  selected: boolean;
  onClick: () => void;
}) {
  const total = log.hsTotalCount ?? 0;
  const success = log.hsSuccessCount ?? 0;
  const failed = log.hsFailedCount ?? 0;
  const skipped = log.hsSkippedCount ?? 0;
  const dur =
    log.completedAt && log.startedAt
      ? Math.round(
          (new Date(log.completedAt).getTime() -
            new Date(log.startedAt).getTime()) /
            1000,
        )
      : null;

  return (
    <ListRow
      onClick={onClick}
      className={cn(
        'cursor-pointer gap-3 rounded-md px-2 py-2 text-xs',
        selected && 'bg-primary/5 ring-primary/30 ring-1',
      )}
    >
      <RunStatusBadge status={log.status} />
      <span className="text-muted-foreground font-mono tabular-nums">
        {new Date(log.startedAt).toLocaleString()}
      </span>
      <span className="text-muted-foreground hidden capitalize sm:inline">
        {String(log.triggeredBy).replace(/_/g, ' ')}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {total > 0 && (
          <span className="text-muted-foreground">{total} companies</span>
        )}
        {success > 0 && (
          <span className="text-success inline-flex items-center gap-0.5">
            <Check className="size-3" /> {success}
          </span>
        )}
        {failed > 0 && (
          <span className="text-destructive inline-flex items-center gap-0.5">
            <X className="size-3" /> {failed}
          </span>
        )}
        {skipped > 0 && (
          <span className="text-muted-foreground inline-flex items-center gap-0.5">
            <SkipForward className="size-3" /> {skipped}
          </span>
        )}
        {dur !== null && (
          <span className="text-muted-foreground hidden md:inline">{dur}s</span>
        )}
      </span>
    </ListRow>
  );
}

export default function CompanyOwnerSection({
  projectId,
  sourcePlatform = 'servicetitan',
}: {
  projectId: string;
  sourcePlatform?: 'servicetitan' | 'dataforma';
}) {
  const isDataforma = sourcePlatform === 'dataforma';
  const { confirm } = useConfirmDialog();
  const [collapsed, setCollapsed] = useState(false);

  const [recentRunsPage, setRecentRunsPage] = useState(1);
  const [recentRunsPageSize, setRecentRunsPageSize] = useState(10);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const logsQuery = useCompanyOwnerLogsQuery(projectId, 50);
  const logs = logsQuery.data ?? [];
  const latestLog = logs[0];

  const resultsQuery = useCompanyOwnerResultsQuery(projectId, {
    runId: selectedRunId,
    page,
    limit: pageSize,
    status: statusFilter,
    search,
  });

  const runAllMutation = useRunAllCompanyOwnersMutation(projectId);

  const runAll = async () => {
    try {
      const stats = await runAllMutation.mutateAsync({});
      const hs = stats?.hubspot ?? {};
      const total = hs.total ?? 0;
      const success = hs.success ?? 0;
      const skipped = hs.skipped ?? 0;
      const failed = hs.failed ?? 0;

      if (total === 0) {
        toast.info('No eligible company records were found to process.');
      } else if (failed > 0 && success === 0) {
        toast.error('Association failed.');
      } else if (failed > 0) {
        toast.warning(
          `Completed with issues — ${success} associated, ${skipped} skipped, ${failed} failed.`,
        );
      } else {
        toast.success(
          `Association completed — ${success} associated${skipped ? `, ${skipped} skipped` : ''}.`,
        );
      }
      setRecentRunsPage(1);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Association failed.');
    }
  };

  const handleRunAll = () => {
    confirm({
      variant: 'info',
      title: 'Associate company owners?',
      description:
        'This will process the available company records and assign matching HubSpot owners.',
      body: (
        <p className="text-muted-foreground text-sm">
          {isDataforma
            ? 'Make sure at least one owner mapping is configured below before running the association.'
            : 'Make sure the required ServiceTitan Sales Person / CAM field is configured before running the association.'}
        </p>
      ),
      confirmLabel: 'Associate Owners',
      onConfirm: runAll,
    });
  };

  const associateOwnersButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleRunAll}
      disabled={runAllMutation.isPending}
    >
      {runAllMutation.isPending ? (
        <>
          <RefreshCw className="animate-spin" /> Running…
        </>
      ) : (
        <>
          <Play /> Associate Owners
        </>
      )}
    </Button>
  );

  const totalRunsPages = Math.max(
    1,
    Math.ceil(logs.length / recentRunsPageSize),
  );
  const pagedLogs = logs.slice(
    (recentRunsPage - 1) * recentRunsPageSize,
    recentRunsPage * recentRunsPageSize,
  );

  const results = resultsQuery.data?.items ?? [];
  const resultsTotal = resultsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(resultsTotal / pageSize));
  const filtersActive = search.length > 0 || statusFilter !== 'all';

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="space-y-0 p-0">
        <div className="flex items-start gap-3 p-4">
          <div className="bg-primary/10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Users className="text-primary size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Company-Owner Sync</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronDown /> : <ChevronUp />}
              </Button>
            </div>
            <p className="text-muted-foreground mt-0.5 max-w-md text-xs">
              {isDataforma
                ? 'Associate Dataforma customers with their matching HubSpot company owners, using your configured field mappings.'
                : 'Associate ServiceTitan customers with their matching HubSpot company owners.'}
            </p>

            {runAllMutation.isPending ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Association is running…
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  Last Run:{' '}
                  {latestLog
                    ? new Date(latestLog.startedAt).toLocaleString()
                    : 'Never'}
                </span>
                {latestLog ? (
                  <RunStatusBadge status={latestLog.status} />
                ) : (
                  <span className="text-muted-foreground">
                    Status: Not run yet
                  </span>
                )}
                {latestLog && (latestLog.hsSuccessCount ?? 0) > 0 && (
                  <span className="text-success flex items-center gap-1">
                    <CheckCircle className="size-2.5" />{' '}
                    {latestLog.hsSuccessCount} assigned
                  </span>
                )}
                {latestLog && (latestLog.hsFailedCount ?? 0) > 0 && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="size-2.5" />{' '}
                    {latestLog.hsFailedCount} failed
                  </span>
                )}
                {latestLog && (latestLog.hsSkippedCount ?? 0) > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="size-2.5" /> {latestLog.hsSkippedCount}{' '}
                    skipped
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3">
          <Alert>
            <Info />
            <AlertDescription>
              {isDataforma
                ? 'Each mapping resolves a Dataforma field (already a real, matched email address) to an active HubSpot owner by email. A source email that has no active HubSpot owner is skipped, not treated as a failure.'
                : 'Requires the appropriate Sales Person custom field to be configured in ServiceTitan. Results may vary if the field is missing or not configured correctly.'}
            </AlertDescription>
          </Alert>
        </div>

        {isDataforma && <DataformaOwnerMappingsEditor projectId={projectId} />}

        <div className="flex items-center gap-2 px-4 pb-3">
          {associateOwnersButton}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              logsQuery.refetch();
              resultsQuery.refetch();
            }}
            disabled={logsQuery.isFetching || runAllMutation.isPending}
            title="Refresh"
          >
            <RefreshCw className={cn(logsQuery.isFetching && 'animate-spin')} />
          </Button>
        </div>

        <Collapsible open={!collapsed}>
          <CollapsibleContent>
            {logsQuery.isError ? (
              <div className="border-t p-4">
                <ErrorState onRetry={() => logsQuery.refetch()} />
              </div>
            ) : !logsQuery.isLoading && logs.length === 0 ? (
              <div className="border-t p-4">
                <EmptyState
                  icon={Users}
                  title="No association results yet"
                  description="Run the association to process company owners."
                  action={{
                    label: 'Associate Owners',
                    icon: Play,
                    onClick: handleRunAll,
                  }}
                />
              </div>
            ) : (
              <>
                <div className="border-t px-4 py-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Association Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Processed', value: latestLog?.hsTotalCount },
                      {
                        label: 'Associated',
                        value: latestLog?.hsSuccessCount,
                      },
                      { label: 'Skipped', value: latestLog?.hsSkippedCount },
                      { label: 'Failed', value: latestLog?.hsFailedCount },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                          {s.label}
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                          {(s.value ?? 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t px-4 py-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Recent Runs
                  </p>
                  {logsQuery.isLoading ? (
                    <SkeletonTable rows={3} columns={4} />
                  ) : (
                    <>
                      <div>
                        {pagedLogs.map((log) => (
                          <RunLogRow
                            key={log.id}
                            log={log}
                            selected={log.id === selectedRunId}
                            onClick={() =>
                              setSelectedRunId((current) =>
                                current === log.id ? null : log.id,
                              )
                            }
                          />
                        ))}
                      </div>
                      {logs.length > recentRunsPageSize && (
                        <div className="mt-3">
                          <PaginationBar
                            page={recentRunsPage}
                            totalPages={totalRunsPages}
                            total={logs.length}
                            pageSize={recentRunsPageSize}
                            onPageChange={setRecentRunsPage}
                            onPageSizeChange={(size) => {
                              setRecentRunsPageSize(size);
                              setRecentRunsPage(1);
                            }}
                            pageSizeOptions={[5, 10]}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t px-4 py-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Association Logs
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Search companies…"
                        className="h-8 w-48 text-sm"
                        disabled={!selectedRunId}
                      />
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                          setStatusFilter(v);
                          setPage(1);
                        }}
                        disabled={!selectedRunId}
                      >
                        <SelectTrigger size="sm" className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Results</SelectItem>
                          <SelectItem value="success">Associated</SelectItem>
                          <SelectItem value="skipped">Skipped</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!selectedRunId ? (
                    <EmptyState
                      icon={Users}
                      title="No run selected"
                      description="Select a run above to view its details."
                    />
                  ) : resultsQuery.isError ? (
                    <ErrorState onRetry={() => resultsQuery.refetch()} />
                  ) : resultsQuery.isLoading ? (
                    <SkeletonTable rows={6} columns={8} />
                  ) : results.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No results"
                      description={
                        filtersActive
                          ? 'No records match your search or filter.'
                          : 'This run has no association results.'
                      }
                    />
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>HubSpot Company</TableHead>
                              <TableHead>HubSpot ID</TableHead>
                              <TableHead>
                                {isDataforma ? 'Matched Value' : 'Sales Person / CAM Value'}
                              </TableHead>
                              <TableHead>Owner Name</TableHead>
                              <TableHead>Owner Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Associated At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.map((r) => (
                              <TableRow key={r.hsId}>
                                <TableCell className="text-sm">
                                  {r.companyName || '—'}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {r.hsId}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.camValue || '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.ownerName || '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.resolvedEmails.length > 0
                                    ? r.resolvedEmails.join(', ')
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  <ResultStatusBadge status={r.result} />
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {r.reason || '—'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {r.associatedAt
                                    ? new Date(r.associatedAt).toLocaleString()
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-3">
                        <PaginationBar
                          page={page}
                          totalPages={totalPages}
                          total={resultsTotal}
                          pageSize={pageSize}
                          onPageChange={setPage}
                          onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
