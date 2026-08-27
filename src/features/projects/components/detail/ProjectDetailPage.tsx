import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  ProjectDetailProvider,
  type ProjectDetailContextValue,
} from './context';
import ProjectHeader from './ProjectHeader';
import ProjectTabContent from './ProjectTabContent';
import ProjectTabs from './ProjectTabs';
import { PageContextAlert } from './shared';

import ActivationConfirmModal from '@/components/connections/ActivationConfirmModal';
import ErrorState from '@/components/shared/ErrorState';
import { BackLink } from '@/components/shared/PageHeader';
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
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id!;
  const openSetupWizard = useSetupWizardStore((s) => s.open);
  const dismissedMap = useAlertDismissStore((s) => s.dismissed);
  const dismiss = useAlertDismissStore((s) => s.dismiss);
  const envAlertId = `project-detail:${projectId}:env-not-activated`;

  const detailQuery = useProjectDetailQuery(projectId);
  const { patchProject, setConnections: setConnectionsCache } =
    useProjectDetailCacheHelpers(projectId);
  const loading = detailQuery.isLoading;
  const refetch = () => detailQuery.refetch();

  const project = detailQuery.data?.project ?? null;
  const jobs = detailQuery.data?.jobs ?? [];
  const connections = detailQuery.data?.connections ?? [];
  const logs = detailQuery.data?.logs ?? [];
  const associationRules = detailQuery.data?.associationRules ?? [];

  const [showCreateJob, setShowCreateJob] = useState(false);

  const hasBothConnections = computeHasBothConnections(connections);
  const hasJobs = jobs.length > 0;

  const { activeTab, tabs, handleTabChange } = useProjectDetailTabs({
    loading,
    hasBothConnections,
    hasJobs,
    jobs,
    connections,
    associationRules,
    logs,
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
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-6 w-56" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
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

  const totalRecordsSynced =
    (project.totalRecordsSynced ?? 0) > 0
      ? project.totalRecordsSynced!
      : jobs.reduce((s, j) => s + (j.recordsSynced || 0), 0);
  const totalErrors =
    (project.totalErrorCount ?? 0) > 0
      ? project.totalErrorCount!
      : jobs.reduce((s, j) => s + (j.errorCount || 0), 0);

  const contextValue: ProjectDetailContextValue = {
    projectId,
    project,
    jobs,
    connections,
    logs,
    associationRules,
    hasBothConnections,
    hasJobs,
    totalRecordsSynced,
    totalErrors,
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
    envDiffLoading: envActivation.envDiffLoading,
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
        className="gap-6"
      >
        <div className="bg-background sticky top-8 z-20 space-y-6 border-b">
          <ProjectHeader />
          <ProjectTabs tabs={tabs} />
        </div>

        <SetupBanner
          project={project}
          connections={connections}
          jobs={jobs}
          onOpenSetup={() => openSetupWizard(project.id)}
        />

        {hasBothConnections &&
          !envActivation.projectActiveEnv &&
          !dismissedMap[envAlertId] && (
            <PageContextAlert
              variant="info"
              title="Connections ready — activate to start syncing"
              description={
                <>
                  Both connections are verified. Use the{' '}
                  <strong>Sandbox</strong> / <strong>Production</strong> toggle
                  above to activate an environment and enable scheduled syncs.
                </>
              }
              dismissible
              onDismiss={() => dismiss(envAlertId)}
            />
          )}

        <ProjectTabContent />
      </Tabs>

      {envActivation.activationModal && (
        <ActivationConfirmModal
          projectId={projectId}
          targetEnv={envActivation.activationModal.targetEnv}
          currentEnv={envActivation.activationModal.currentEnv}
          diff={envActivation.activationModal.diff}
          onActivate={envActivation.doActivate}
          activating={envActivation.envActivating}
          onClose={envActivation.closeActivationModal}
        />
      )}
    </ProjectDetailProvider>
  );
}
