import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  ProjectDetailProvider,
  type ProjectDetailContextValue,
} from './context';
import ProjectHeader from './ProjectHeader';
import ProjectOnboardingJourney from './ProjectOnboardingJourney';
import ProjectTabContent from './ProjectTabContent';
import ProjectTabs from './ProjectTabs';

import AccountContextAlert from '@/components/shared/AccountContextAlert';
import ErrorState from '@/components/shared/ErrorState';
import { BackLink } from '@/components/shared/PageHeader';
import StickyDetailHeader from '@/components/shared/StickyDetailHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { projectsApi } from '@/api/projects';
import type { ProjectStatus } from '@/types';
import { toast } from 'sonner';
import {
  useProjectDetailCacheHelpers,
  useProjectDetailQuery,
  useProjectDetailTabs,
  useProjectDetailLiveSync,
  useProjectEnvironmentActivation,
} from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import { hasBothConnections as computeHasBothConnections } from '@/features/projects/lib/projectConnections';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = id!;

  const detailQuery = useProjectDetailQuery(projectId);
  const { patchProject, setConnections: setConnectionsCache } =
    useProjectDetailCacheHelpers(projectId);
  const loading = detailQuery.isLoading;
  const refetch = () => detailQuery.refetch();

  const project = detailQuery.data?.project ?? null;
  const jobs = detailQuery.data?.jobs ?? [];
  const connections = detailQuery.data?.connections ?? [];
  const logs = detailQuery.data?.logs ?? [];

  const [showCreateJob, setShowCreateJob] = useState(
    () => searchParams.get('create') === 'true' || searchParams.get('create') === '1',
  );

  useEffect(() => {
    if (searchParams.get('create') === 'true' || searchParams.get('create') === '1') {
      setShowCreateJob(true);
    }
  }, [searchParams]);

  const handleSetShowCreateJob = (show: boolean) => {
    setShowCreateJob(show);
    if (!show && searchParams.get('create')) {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  };

  const hasBothConnections = computeHasBothConnections(connections);
  const hasJobs = jobs.length > 0;

  const { activeTab, tabs, handleTabChange } = useProjectDetailTabs({
    loading,
    hasBothConnections,
    hasJobs,
  });

  const envActivation = useProjectEnvironmentActivation({
    projectId,
    project,
    connections,
    loading,
    patchProject,
    refetch,
  });

  useProjectDetailLiveSync(projectId, refetch);

  // Automated self-healing project status management:
  // 1. Promotes from 'draft' to 'active' when both platforms are verified during onboarding.
  // 2. Restores from 'error' to their previous state ('active' or 'draft') when broken connections are fixed and re-verified.
  // 3. Demotes from 'active' to 'error' when an active project's connection fails or is disconnected.
  const isUpdatingStatusRef = useRef(false);

  useEffect(() => {
    if (
      loading ||
      !detailQuery.data ||
      !project ||
      isUpdatingStatusRef.current
    ) {
      return;
    }

    const prevStatusKey = `synkazo:proj-prev-status:${projectId}`;

    if (hasBothConnections) {
      if (project.status === 'draft') {
        isUpdatingStatusRef.current = true;
        projectsApi
          .updateProject(projectId, { status: 'active' as ProjectStatus })
          .then(() => {
            patchProject({ status: 'active' as ProjectStatus });
            try {
              sessionStorage.removeItem(prevStatusKey);
            } catch {}
            toast.success(
              'Both platforms connected! Project is now active and ready for sync flows.',
            );
          })
          .catch(() => {})
          .finally(() => {
            isUpdatingStatusRef.current = false;
          });
      } else if (project.status === 'error') {
        isUpdatingStatusRef.current = true;
        let targetStatus: ProjectStatus = 'active';
        try {
          const stored = sessionStorage.getItem(prevStatusKey);
          if (stored === 'draft') {
            targetStatus = 'draft';
          } else {
            targetStatus = 'active';
          }
        } catch {
          targetStatus = 'active';
        }

        projectsApi
          .updateProject(projectId, { status: targetStatus })
          .then(() => {
            patchProject({ status: targetStatus });
            try {
              sessionStorage.removeItem(prevStatusKey);
            } catch {}
            if (targetStatus === 'active') {
              toast.success(
                'Connections restored! Project is active and ready for sync flows.',
              );
            } else {
              toast.success(
                'Connections restored! Project returned to draft status.',
              );
            }
          })
          .catch(() => {})
          .finally(() => {
            isUpdatingStatusRef.current = false;
          });
      }
    } else {
      // Connections are broken or missing on an active project
      if (project.status === 'active') {
        try {
          sessionStorage.setItem(prevStatusKey, 'active');
        } catch {}
        isUpdatingStatusRef.current = true;
        projectsApi
          .updateProject(projectId, { status: 'error' as ProjectStatus })
          .then(() => {
            patchProject({ status: 'error' as ProjectStatus });
            toast.error(
              'Connection issue detected — Project status set to Error.',
            );
          })
          .catch(() => {})
          .finally(() => {
            isUpdatingStatusRef.current = false;
          });
      }
    }
  }, [
    hasBothConnections,
    project?.status,
    projectId,
    patchProject,
    loading,
    detailQuery.data,
    jobs.length,
  ]);

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="space-y-3 pb-3">
          <Skeleton className="size-9 rounded-3xl" />
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-6 w-56" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <BackLink label="Back to Projects" to="/projects" />
        <ErrorState onRetry={() => detailQuery.refetch()} />
      </div>
    );
  }

  const contextValue: ProjectDetailContextValue = {
    projectId,
    project,
    jobs,
    connections,
    logs,
    hasBothConnections,
    hasJobs,
    activeTab,
    patchProject,
    setConnectionsCache,
    refetch,
    handleTabChange,
    showCreateJob,
    setShowCreateJob: handleSetShowCreateJob,
    onCreateSyncRule: () => {
      handleTabChange('sync-rules');
      handleSetShowCreateJob(true);
    },
    projectActiveEnv: envActivation.projectActiveEnv,
    envActivating: envActivation.envActivating,
    environmentActivationError: envActivation.activationError,
    clearEnvironmentActivationError: envActivation.clearActivationError,
    envFullyConnected: envActivation.envFullyConnected,
    envHasAnyConnected: envActivation.envHasAnyConnected,
    onActivateEnv: envActivation.handleActivateEnv,
    connReloadKey: envActivation.connReloadKey,
  };

  return (
    <ProjectDetailProvider value={contextValue}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as ProjectDetailTabId)}
        className="gap-0"
      >
        <StickyDetailHeader
          backLabel="Back to Projects"
          backTo="/projects"
          header={
            <Card className="gap-0 space-y-3 overflow-hidden py-0">
              <ProjectHeader />
              <div className="overflow-x-auto px-5">
                <ProjectTabs tabs={tabs} />
              </div>
            </Card>
          }
        >
          <ProjectOnboardingJourney />
          <AccountContextAlert />
          <ProjectTabContent />
        </StickyDetailHeader>
      </Tabs>
    </ProjectDetailProvider>
  );
}
