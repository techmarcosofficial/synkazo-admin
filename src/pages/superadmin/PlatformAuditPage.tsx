import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Clock,
  Info,
  type LucideIcon,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import DateRangePicker from '@/components/shared/DateRangePicker';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import StatCardGrid from '@/components/shared/StatCardGrid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePlatformAuditLogsQuery } from '@/queries/useAudit';
import { useOrgsQuery } from '@/queries/useOrganisations';
import { useSystemLogsQuery } from '@/queries/useSystemLogs';
import { useUsersQuery } from '@/queries/useUsers';
import type { AuditSeverity } from '@/types/audit';

const SEVERITY_CONFIG: Record<
  string,
  { label: string; iconClassName: string; Icon: LucideIcon }
> = {
  info: { label: 'Info', iconClassName: 'text-info', Icon: Info },
  warning: {
    label: 'Warning',
    iconClassName: 'text-warning',
    Icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    iconClassName: 'text-destructive',
    Icon: ShieldAlert,
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  return (
    <Badge className="bg-muted text-muted-foreground gap-1 rounded-full font-semibold">
      <cfg.Icon className={cn('size-2.5', cfg.iconClassName)} />
      {cfg.label}
    </Badge>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const AUDIT_TABLE_HEADERS = [
  'Severity',
  'Action',
  'Organization',
  'Resource',
  'User',
  'IP Address',
  'Time',
];

const SYSTEM_TABLE_HEADERS = ['Severity', 'Action', 'Resource', 'Time'];

const SEVERITY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export default function PlatformAuditPage() {
  // ── Audit Log tab state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [organisationId, setOrganisationId] = useState('all');
  const [userId, setUserId] = useState('all');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const auditFilters = {
    search: search.trim() || undefined,
    organisationId: organisationId === 'all' ? undefined : organisationId,
    userId: userId === 'all' ? undefined : userId,
    action: action.trim() || undefined,
    severity: severity === 'all' ? undefined : (severity as AuditSeverity),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const auditQuery = usePlatformAuditLogsQuery(page, pageSize, auditFilters);
  const auditStatsQuery = usePlatformAuditLogsQuery(1, 100, {});
  const orgsQuery = useOrgsQuery();
  const usersQuery = useUsersQuery();

  // ── System Log tab state ─────────────────────────────────────────────────
  const [sysPage, setSysPage] = useState(1);
  const [sysPageSize, setSysPageSize] = useState(10);
  const [sysSearch, setSysSearch] = useState('');

  const systemQuery = useSystemLogsQuery(
    sysPage,
    sysPageSize,
    sysSearch.trim(),
  );
  const systemStatsQuery = useSystemLogsQuery(1, 100, '');

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    (orgsQuery.data ?? []).forEach((org) => map.set(org.id, org.name));
    return map;
  }, [orgsQuery.data]);

  const auditRes = auditQuery.data;
  const auditLogs = auditRes?.data ?? [];
  const auditTotal = auditRes?.total ?? auditLogs.length;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / pageSize));

  const systemRes = systemQuery.data;
  const systemLogs = systemRes?.data ?? [];
  const systemTotal = systemRes?.total ?? systemLogs.length;
  const systemTotalPages = Math.max(1, Math.ceil(systemTotal / sysPageSize));

  const auditStatsLogs = auditStatsQuery.data?.data ?? [];
  const systemStatsLogs = systemStatsQuery.data?.data ?? [];
  const totalEvents =
    (auditStatsQuery.data?.total ?? auditStatsLogs.length) +
    (systemStatsQuery.data?.total ?? systemStatsLogs.length);
  const criticalCount =
    auditStatsLogs.filter((l) => l.severity === 'critical').length +
    systemStatsLogs.filter((l) => l.severity === 'critical').length;
  const orgsAffected = new Set(
    [...auditStatsLogs, ...systemStatsLogs]
      .map((l) => l.organisationId)
      .filter(Boolean),
  ).size;

  const hasActiveAuditFilters =
    !!search.trim() ||
    organisationId !== 'all' ||
    userId !== 'all' ||
    !!action.trim() ||
    severity !== 'all' ||
    !!dateFrom ||
    !!dateTo;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleSysSearchChange = (value: string) => {
    setSysSearch(value);
    setSysPage(1);
  };

  const handleSysPageSizeChange = (size: number) => {
    setSysPageSize(size);
    setSysPage(1);
  };

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
      title="Platform Audit"
      description="Platform-wide administrative, security, and organization activity across synkazo"
      actions={
        <Button
          variant="outline"
          onClick={() => {
            auditQuery.refetch();
            systemQuery.refetch();
          }}
          disabled={auditQuery.isFetching || systemQuery.isFetching}
        >
          <RefreshCw
            className={cn(
              (auditQuery.isFetching || systemQuery.isFetching) &&
                'animate-spin',
            )}
          />
          Refresh
        </Button>
      }
    />
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <StatCardGrid
        columns={3}
        stats={[
          {
            label: 'Total Events',
            value: totalEvents,
            icon: ClipboardList,
            tone: 'bg-primary/10 text-primary',
          },
          {
            label: 'Critical Events',
            value: criticalCount,
            icon: ShieldAlert,
            tone: 'bg-destructive/10 text-destructive',
          },
          {
            label: 'Organizations Affected',
            value: orgsAffected,
            icon: Building2,
            tone: 'bg-info/10 text-info',
          },
        ]}
      />

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="system">System Log</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6">
          {auditQuery.isLoading ? (
            <Card className="overflow-hidden py-0">
              <SkeletonTable rows={8} columns={7} />
            </Card>
          ) : auditQuery.isError && !auditRes ? (
            <ErrorState onRetry={() => auditQuery.refetch()} />
          ) : (
            <>
              {auditQuery.isError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>
                    Failed to refresh — showing the last loaded page.
                  </AlertDescription>
                </Alert>
              )}

              {auditLogs.length === 0 &&
              !hasActiveAuditFilters &&
              page === 1 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No platform activity yet"
                  description="Platform-wide administrative and security activity will appear here."
                  viewMode="table"
                />
              ) : (
                <Card>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">
                          Review platform activity
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          What happened across synkazo, and who did it
                        </p>
                      </div>
                      <ManagementToolbar
                        searchValue={search}
                        onSearchChange={handleSearchChange}
                        searchPlaceholder="Search platform activity…"
                        filters={
                          <>
                            <Select
                              value={organisationId}
                              onValueChange={(v) => {
                                setOrganisationId(v);
                                setPage(1);
                              }}
                            >
                              <SelectTrigger className="bg-muted sm:w-44">
                                <SelectValue placeholder="Organization" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All organizations
                                </SelectItem>
                                {(orgsQuery.data ?? []).map((org) => (
                                  <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={userId}
                              onValueChange={(v) => {
                                setUserId(v);
                                setPage(1);
                              }}
                            >
                              <SelectTrigger className="bg-muted sm:w-40">
                                <SelectValue placeholder="User" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All users</SelectItem>
                                {(usersQuery.data ?? []).map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={action}
                              onChange={(e) => {
                                setAction(e.target.value);
                                setPage(1);
                              }}
                              placeholder="Event type…"
                              className="bg-muted sm:w-36"
                            />

                            <Select
                              value={severity}
                              onValueChange={(v) => {
                                setSeverity(v);
                                setPage(1);
                              }}
                            >
                              <SelectTrigger className="bg-muted sm:w-36">
                                <SelectValue placeholder="Severity" />
                              </SelectTrigger>
                              <SelectContent>
                                {SEVERITY_FILTER_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <DateRangePicker
                              value={{ from: dateFrom, to: dateTo }}
                              onChange={(range) => {
                                setDateFrom(range.from ?? '');
                                setDateTo(range.to ?? '');
                                setPage(1);
                              }}
                              placeholder="Date range"
                              className="sm:w-44"
                            />
                          </>
                        }
                      />
                    </div>
                    {auditLogs.length === 0 ? (
                      <EmptyState
                        icon={ClipboardList}
                        title="No platform activity matches your filters"
                        viewMode="table"
                      />
                    ) : (
                      <div className="overflow-hidden rounded-4xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted hover:bg-muted/50">
                              {AUDIT_TABLE_HEADERS.map((h) => (
                                <TableHead key={h} className="font-semibold">
                                  {h}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditLogs.map((log, i) => (
                              <TableRow key={log.id ?? i}>
                                <TableCell className="py-2">
                                  <SeverityBadge
                                    severity={log.severity ?? 'info'}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {log.action}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {log.organisationId
                                    ? (orgNameById.get(log.organisationId) ??
                                      log.organisationId.slice(0, 8))
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  <span>{log.resource}</span>
                                  {log.resourceId && (
                                    <span className="bg-muted text-muted-foreground ml-1.5 rounded px-1.5 py-0.5 font-mono text-xs">
                                      {String(log.resourceId).slice(0, 12)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-muted-foreground flex items-center gap-1.5">
                                    <User className="size-3" />
                                    <span>
                                      {log.userEmail ?? log.userId ?? '—'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono text-xs">
                                  {log.ipAddress ?? '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    <Clock className="size-3" />
                                    {formatDate(log.createdAt)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <PaginationBar
                      page={page}
                      totalPages={auditTotalPages}
                      total={auditTotal}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {systemQuery.isLoading ? (
            <Card className="overflow-hidden py-0">
              <SkeletonTable rows={8} columns={4} />
            </Card>
          ) : systemQuery.isError && !systemRes ? (
            <ErrorState onRetry={() => systemQuery.refetch()} />
          ) : (
            <>
              {systemQuery.isError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>
                    Failed to refresh — showing the last loaded page.
                  </AlertDescription>
                </Alert>
              )}

              {systemLogs.length === 0 && !sysSearch.trim() && sysPage === 1 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No system events yet"
                  description="Operational and technical activity will appear here."
                  viewMode="table"
                />
              ) : (
                <Card>
                  <CardContent className="space-y-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">
                          Review system activity
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Operational and technical activity trail
                        </p>
                      </div>
                      <ManagementToolbar
                        searchValue={sysSearch}
                        onSearchChange={handleSysSearchChange}
                        searchPlaceholder="Search system logs…"
                      />
                    </div>
                    {systemLogs.length === 0 ? (
                      <EmptyState
                        icon={ClipboardList}
                        title="No system logs match your search"
                        viewMode="table"
                      />
                    ) : (
                      <div className="overflow-hidden rounded-4xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted hover:bg-muted/50">
                              {SYSTEM_TABLE_HEADERS.map((h) => (
                                <TableHead key={h} className="font-semibold">
                                  {h}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {systemLogs.map((log, i) => (
                              <TableRow key={log.id ?? i}>
                                <TableCell className="py-2">
                                  <SeverityBadge
                                    severity={log.severity ?? 'info'}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {log.action}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  <span>{log.resource}</span>
                                  {log.resourceId && (
                                    <span className="bg-muted text-muted-foreground ml-1.5 rounded px-1.5 py-0.5 font-mono text-xs">
                                      {String(log.resourceId).slice(0, 12)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    <Clock className="size-3" />
                                    {formatDate(log.createdAt)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <PaginationBar
                      page={sysPage}
                      totalPages={systemTotalPages}
                      total={systemTotal}
                      pageSize={sysPageSize}
                      onPageChange={setSysPage}
                      onPageSizeChange={handleSysPageSizeChange}
                    />
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
