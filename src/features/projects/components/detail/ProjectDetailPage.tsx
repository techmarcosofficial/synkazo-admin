import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  ProjectDetailProvider,
  type ProjectDetailContextValue,
} from './context';
import ProjectHeader from './ProjectHeader';
import ProjectTabContent from './ProjectTabContent';
import ProjectTabs from './ProjectTabs';

import ErrorState from '@/components/shared/ErrorState';
import { BackLink } from '@/components/shared/PageHeader';
import StickyDetailHeader from '@/components/shared/StickyDetailHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { SetupBanner } from '@/features/projects/components/setup';
import {
  useProjectDetailCacheHelpers,
  useProjectDetailQuery,
  useProjectDetailTabs,
  useProjectDetailLiveSync,
  useProjectEnvironmentActivation,
} from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import { hasBothConnections as computeHasBothConnections } from '@/features/projects/lib/projectSetupState';
import { useSetupWizardStore } from '@/features/projects/store';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id!;
  const openSetupWizard = useSetupWizardStore((s) => s.open);

  const detailQuery = useProjectDetailQuery(projectId);
  const { patchProject, setConnections: setConnectionsCache } =
    useProjectDetailCacheHelpers(projectId);
  const loading = detailQuery.isLoading;
  const refetch = () => detailQuery.refetch();

  const project = detailQuery.data?.project ?? null;
  const jobs = detailQuery.data?.jobs ?? [];
  const connections = detailQuery.data?.connections ?? [];
  const logs = detailQuery.data?.logs ?? [];

  const [showCreateJob, setShowCreateJob] = useState(false);

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
    patchProject,
    setConnectionsCache,
    refetch,
    handleTabChange,
    showCreateJob,
    setShowCreateJob,
    onCreateSyncRule: () => {
      handleTabChange('sync-rules');
      setShowCreateJob(true);
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
          <SetupBanner
            project={project}
            connections={connections}
            onOpenSetup={() => openSetupWizard(project.id)}
          />

          <ProjectTabContent />
        </StickyDetailHeader>
      </Tabs>
    </ProjectDetailProvider>
  );
}
