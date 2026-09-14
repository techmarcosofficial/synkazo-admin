import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
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
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <ListRow asChild>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          'w-full cursor-pointer gap-3 rounded-3xl px-2 py-2 text-left text-xs',
          selected && 'bg-primary/5 ring-primary/30 ring-1',
        )}
      >
        <StatusBadge status={log.status} size="sm" />
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
            <span className="text-muted-foreground hidden md:inline">
              {dur}s
            </span>
          )}
        </span>
      </button>
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
  const [historyOpen, setHistoryOpen] = useState(true);
  const [runError, setRunError] = useState<string | null>(null);

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
    setRunError(null);
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
      const message =
        e?.response?.data?.message ??
        'Company owners could not be associated. Review the configuration and try again.';
      setRunError(message);
      toast.error(message);
      throw err;
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
            ? 'Configured mappings are used when present; otherwise the documented default Dataforma owner mapping is used.'
            : 'Make sure the required ServiceTitan Sales Person / CAM field is configured before running the association.'}
        </p>
      ),
      confirmLabel: 'Associate Owners',
      onConfirm: runAll,
    });
  };

  const associateOwnersButton = (
    <Button
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
  const selectedLog = logs.find((log) => log.id === selectedRunId);

  const selectRun = (runId: string) => {
    setSelectedRunId((current) => (current === runId ? null : runId));
    setPage(1);
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="flex items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Users className="text-primary size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-semibold">
                  Company owner association
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {sourcePlatform}
                </Badge>
                {latestLog && (
                  <StatusBadge status={latestLog.status} size="sm" />
                )}
              </div>
              <CardDescription className="mt-1 max-w-2xl text-xs">
                Match company ownership data from{' '}
                {isDataforma ? 'Dataforma' : 'ServiceTitan'} to active HubSpot
                owners and assign them to synced companies. Priority execution
                may also run this workflow as its final queue stage.
              </CardDescription>
              <p className="text-muted-foreground mt-2 text-xs">
                Last run:{' '}
                {latestLog
                  ? new Date(latestLog.startedAt).toLocaleString()
                  : logsQuery.isLoading
                    ? 'Loading…'
                    : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void logsQuery.refetch();
                if (selectedRunId) void resultsQuery.refetch();
              }}
              disabled={logsQuery.isFetching || runAllMutation.isPending}
            >
              <RefreshCw
                className={cn(logsQuery.isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
            {associateOwnersButton}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-5 pb-5">
          {runAllMutation.isPending && (
            <Alert>
              <RefreshCw className="animate-spin" />
              <AlertDescription>
                Owner assignment is running. The run history will refresh when
                it finishes.
              </AlertDescription>
            </Alert>
          )}

          {runError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{runError}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info />
            <AlertDescription>
              {isDataforma
                ? 'Each mapping resolves a Dataforma email field to an active HubSpot owner. An email without an active owner is skipped rather than failed.'
                : 'This workflow requires the appropriate ServiceTitan Sales Person or CAM custom field. Missing or invalid values are reported in the selected run results.'}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Processed', value: latestLog?.hsTotalCount },
              { label: 'Associated', value: latestLog?.hsSuccessCount },
              { label: 'Skipped', value: latestLog?.hsSkippedCount },
              { label: 'Failed', value: latestLog?.hsFailedCount },
            ].map((metric) => (
              <div key={metric.label} className="bg-muted/50 rounded-3xl p-4">
                <p className="text-muted-foreground text-xs font-medium">
                  {metric.label}
                </p>
                {logsQuery.isLoading ? (
                  <div className="bg-muted mt-2 h-7 w-12 animate-pulse rounded" />
                ) : logsQuery.isError ? (
                  <p className="text-muted-foreground mt-1 text-2xl font-semibold">
                    —
                  </p>
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {(metric.value ?? 0).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isDataforma && (
        <Card className="py-0 shadow-none">
          <CardContent className="p-5">
            <DataformaOwnerMappingsEditor projectId={projectId} />
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <h4 className="text-sm font-semibold">Recent runs</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                Select a run to inspect its company-level assignment results.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-label={historyOpen ? 'Hide run history' : 'Show run history'}
              aria-expanded={historyOpen}
            >
              {historyOpen ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>

          <Collapsible open={historyOpen}>
            <CollapsibleContent className="border-t p-5">
              {logsQuery.isError ? (
                <ErrorState onRetry={() => logsQuery.refetch()} />
              ) : logsQuery.isLoading ? (
                <SkeletonTable rows={3} columns={4} />
              ) : logs.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No owner-assignment runs yet"
                  description="Run owner assignment to process eligible companies."
                  action={{
                    label: 'Associate owners',
                    icon: Play,
                    onClick: handleRunAll,
                  }}
                />
              ) : (
                <>
                  <div>
                    {pagedLogs.map((log) => (
                      <RunLogRow
                        key={log.id}
                        log={log}
                        selected={log.id === selectedRunId}
                        onClick={() => selectRun(log.id)}
                      />
                    ))}
                  </div>
                  {logs.length > recentRunsPageSize && (
                    <div className="mt-4">
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {selectedRunId && (
        <Card className="py-0 shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold">Run results</h4>
                  {selectedLog && (
                    <StatusBadge status={selectedLog.status} size="sm" />
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {selectedLog
                    ? `Started ${new Date(selectedLog.startedAt).toLocaleString()}`
                    : 'Selected owner-assignment run'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search companies…"
                  className="h-8 w-full text-sm sm:w-52"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="success">Associated</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {resultsQuery.isError ? (
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
                <div className="overflow-x-auto rounded-4xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>HubSpot Company</TableHead>
                        <TableHead>HubSpot ID</TableHead>
                        <TableHead>
                          {isDataforma
                            ? 'Matched Value'
                            : 'Sales Person / CAM Value'}
                        </TableHead>
                        <TableHead>Owner Name</TableHead>
                        <TableHead>Owner Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Associated At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.hsId}>
                          <TableCell className="text-sm">
                            {result.companyName || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {result.hsId}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.camValue || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.ownerName || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.resolvedEmails.length > 0
                              ? result.resolvedEmails.join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <ResultStatusBadge status={result.result} />
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs text-xs break-words">
                            {result.reason || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {result.associatedAt
                              ? new Date(result.associatedAt).toLocaleString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
