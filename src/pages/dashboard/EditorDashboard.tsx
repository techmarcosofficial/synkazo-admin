import { format } from 'date-fns';
import {
  Activity,
  CheckCircle,
  FileText,
  FolderOpen,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListRow from '@/components/shared/list/ListRow';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrgSyncLog } from '@/features/dashboard';
import { PERMISSION_LABELS } from '@/lib/permissions';
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { cn } from '@/lib/utils';
import { useOrgSyncLogsQuery } from '@/queries/useDashboard';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';

const LOG_TONE: Record<string, string> = {
  info: 'bg-info',
  warn: 'bg-warning',
  error: 'bg-destructive',
  success: 'bg-success',
};

const STATUS_LABEL: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-success', label: 'Success' },
  partial: { dot: 'bg-warning', label: 'Partial' },
  failed: { dot: 'bg-destructive', label: 'Failed' },
  cancelled: { dot: 'bg-muted-foreground', label: 'Stopped' },
};

function EditorDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonStatGrid count={3} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-0">
          <SkeletonList count={4} />
        </Card>
        <Card className="p-0">
          <SkeletonList count={4} />
        </Card>
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  const { currentUser, hasPermission } = useSBAuth();
  const projectsQuery = useProjectsQuery();
  const jobsQuery = useJobsQuery();
  const logsQuery = useOrgSyncLogsQuery(20);

  const isLoading =
    projectsQuery.isLoading || jobsQuery.isLoading || logsQuery.isLoading;
  const hasNoData =
    (projectsQuery.isError && projectsQuery.data === undefined) ||
    (jobsQuery.isError && jobsQuery.data === undefined) ||
    (logsQuery.isError && logsQuery.data === undefined);

  const projects = projectsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const logsRes = logsQuery.data;
  const logs = (
    Array.isArray(logsRes) ? logsRes : (logsRes?.data ?? [])
  ) as OrgSyncLog[];

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title={`Welcome back, ${currentUser?.fullName?.split(' ')[0] || 'Editor'}`}
      description={`Editor · ${currentUser?.email}`}
      actions={
        !hasPermission('project.view') && (
          <Badge className="bg-warning/10 text-warning gap-1.5">
            <Lock className="size-3" /> Limited Access
          </Badge>
        )
      }
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <EditorDashboardSkeleton />
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            projectsQuery.refetch();
            jobsQuery.refetch();
            logsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const canView = hasPermission('project.view');
  const myPermissions = (currentUser?.permissions || []).filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  const stats: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      label: 'Assigned Projects',
      value: projects.length,
      icon: FolderOpen,
      tone: 'text-primary',
    },
    {
      label: 'Active Jobs',
      value: jobs.filter((j) => j.isEnabled).length,
      icon: Activity,
      tone: 'text-success',
    },
    {
      label: 'Recent Logs',
      value: logs.length,
      icon: FileText,
      tone: 'text-paused',
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {stat.label}
                </span>
                <stat.icon className={cn('size-4', stat.tone)} />
              </div>
              <div className={cn('text-2xl font-bold', stat.tone)}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="bg-muted/40 border-b py-3!">
            <CardTitle>Your Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <EmptyState
                icon={Lock}
                title="No projects assigned yet"
                description="Contact your organisation admin."
              />
            ) : (
              <div>
                {projects.map((p) => (
                  <ListRow
                    key={p.id}
                    asChild
                    className={cn(
                      'justify-between',
                      !canView &&
                        'cursor-not-allowed opacity-60 hover:bg-transparent',
                    )}
                  >
                    <Link to={canView ? `/projects/${p.id}` : '#'}>
                      <p className="text-sm font-medium">{p.name}</p>
                      <StatusBadge status={p.status} size="sm" />
                    </Link>
                  </ListRow>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="bg-muted/40 border-b py-3!">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-muted-foreground px-5 py-8 text-center text-sm">
                No recent activity.
              </div>
            ) : (
              <div>
                {logs.slice(0, 10).map((log) => {
                  const status = STATUS_LABEL[log.metadata?.status ?? ''];
                  const title = log.jobRunId
                    ? `Run ID: ${log.jobRunId}`
                    : undefined;
                  return (
                    <ListRow key={log.id} className="items-start" title={title}>
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          LOG_TONE[log.level ?? ''] ?? 'bg-muted-foreground',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {status && (
                            <Badge className="bg-muted text-muted-foreground gap-1 rounded-full text-[10px] font-medium">
                              <span
                                className={cn(
                                  'size-1.5 rounded-full',
                                  status.dot,
                                )}
                              />
                              {status.label}
                            </Badge>
                          )}
                          {log.metadata?.projectName && (
                            <span className="text-xs font-medium">
                              {log.metadata.projectName}
                            </span>
                          )}
                          {log.metadata?.sourcePlatformId &&
                            log.metadata?.destPlatformId && (
                              <PlatformPair
                                sourcePlatformId={log.metadata.sourcePlatformId}
                                destPlatformId={log.metadata.destPlatformId}
                                variant="text"
                                size="sm"
                              />
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {log.message}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {log.createdAt
                          ? format(new Date(log.createdAt), 'MMM d HH:mm')
                          : '—'}
                      </span>
                    </ListRow>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="text-muted-foreground size-4" /> Your Access Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Role: <span className="text-foreground font-medium">Editor</span> —
            permissions granted by your organisation admin.
          </p>
          <div className="flex flex-wrap gap-2">
            {myPermissions.length > 0 ? (
              myPermissions.map((perm) => (
                <Badge key={perm} className="bg-success/10 text-success gap-1">
                  <CheckCircle className="size-2.5" />{' '}
                  {PERMISSION_LABELS[perm] || perm}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">
                Default editor permissions apply. Contact your org admin to
                expand access.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
