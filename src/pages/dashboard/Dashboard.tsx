import { useEffect, useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  computeDashboardStats,
  DashboardOnboardingEmptyState,
  DashboardSkeleton,
  KpiStatCard,
  ProjectsOverviewCard,
  RecentActivityCard,
} from '@/features/dashboard';
import type { OrgSyncLog } from '@/features/dashboard';
import {
  CreateProjectButton,
  CreateProjectDialog,
} from '@/features/projects/components/create';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  useDashboardSummaryQuery,
  useOrgSyncLogsQuery,
} from '@/queries/useDashboard';
import { useJobsQuery } from '@/queries/useJobs';
import { useOrgsQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import { useHeaderStore } from '@/stores/useHeaderStore';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { currentUser } = useSynkazoAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const projectsQuery = useProjectsQuery();
  const jobsQuery = useJobsQuery();
  const logsQuery = useOrgSyncLogsQuery(12);
  const summaryQuery = useDashboardSummaryQuery();
  const orgsQuery = useOrgsQuery({ enabled: isSuperAdmin });
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const setActions = useHeaderStore((s) => s.setActions);
  const clearActions = useHeaderStore((s) => s.clearActions);

  const isLoading =
    projectsQuery.isLoading ||
    jobsQuery.isLoading ||
    logsQuery.isLoading ||
    summaryQuery.isLoading;
  const isError =
    projectsQuery.isError ||
    jobsQuery.isError ||
    logsQuery.isError ||
    summaryQuery.isError;

  const refetchAll = () => {
    projectsQuery.refetch();
    jobsQuery.refetch();
    logsQuery.refetch();
    summaryQuery.refetch();
  };

  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const organisations = orgsQuery.data ?? [];

  useEffect(() => {
    setActions(<CreateProjectButton />);
    return () => clearActions();
  }, []);

  const header = (
    <PageHeader
      title={`${getGreeting()}, ${firstName}`}
      badge={
        <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
      }
      description="Here's what's happening with your syncs today."
      actions={
        isSuperAdmin && (
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All organisations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organisations</SelectItem>
              {organisations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    />
  );

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full space-y-6">
        {header}
        <ErrorState onRetry={refetchAll} />
      </div>
    );
  }

  const allProjects = projectsQuery.data ?? [];

  if (allProjects.length === 0) {
    return (
      <>
        <DashboardOnboardingEmptyState />
        <CreateProjectDialog />
      </>
    );
  }

  const projects =
    isSuperAdmin && selectedOrgId !== 'all'
      ? allProjects.filter((p) => p.organisationId === selectedOrgId)
      : allProjects;
  const jobs = (jobsQuery.data ?? []).map((job) => ({
    ...job,
    isRunning: job.isRunning ?? false,
  }));
  const logsRes = logsQuery.data;
  const logs: OrgSyncLog[] =
    (logsRes as unknown as { data?: OrgSyncLog[] })?.data ??
    (logsRes as unknown as OrgSyncLog[]) ??
    [];
  const summary = summaryQuery.data;

  // Turns the raw query results into card-ready stats, filling in honest
  // fallbacks ("—", "not tracked yet") for anything the API doesn't report yet
  // instead of inventing numbers. See features/dashboard/utils.ts for the rules.
  const stats = computeDashboardStats({ projects, jobs, logs, summary });

  return (
    <>
      <div className="w-full space-y-6">
        {header}

        <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <KpiStatCard key={stat.id} {...stat} />
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Projects & Activitys</h3>
              <p className="text-muted-foreground text-xs">
                Here the view for recent projects and acitivies
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
              <ProjectsOverviewCard projects={projects} />
              <RecentActivityCard logs={logs} />
            </div>
          </CardContent>
        </Card>
      </div>
      <CreateProjectDialog />
    </>
  );
}
