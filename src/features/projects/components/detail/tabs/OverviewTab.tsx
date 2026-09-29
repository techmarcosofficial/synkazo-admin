import { ArrowRight } from 'lucide-react';

import { useProjectDetailContext } from '../context';
import ProjectKeyMetrics from '../overview/ProjectKeyMetrics';
import ProjectRecentActivity from '../overview/ProjectRecentActivity';
import ProjectUpcomingEvents from '../overview/ProjectUpcomingEvents';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DraftResumptionBanner } from '@/features/journey';
import { selectProjectOnboardingStage } from '@/features/onboarding';
import { getProjectOverviewMetrics } from '@/features/projects/lib/projectOverview';

export default function OverviewTab() {
  const {
    project,
    jobs,
    logs,
    hasBothConnections,
    projectActiveEnv,
    envFullyConnected,
    handleTabChange,
    onCreateSyncRule,
  } = useProjectDetailContext();

  const metrics = getProjectOverviewMetrics(project, jobs);
  const isGraduated =
    selectProjectOnboardingStage({
      hasBothConnections,
      hasJobs: jobs.length > 0,
      jobs,
      runStatuses: logs
        .filter((log) => jobs.some((job) => job.id === log.jobId))
        .map((log) => log.metadata?.status),
    }) === 'complete';
  const isProductionReady = Boolean(envFullyConnected?.('production'));

  return (
    <div className="space-y-6">
      {isGraduated && projectActiveEnv === 'sandbox' && (
        <Card
          size="sm"
          className={
            isProductionReady
              ? 'rounded-3xl border-primary/30 bg-primary/[0.04] p-4'
              : 'rounded-3xl border-warning/30 bg-warning/[0.04] p-4'
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={isProductionReady ? 'production' : 'sandbox'}
                  label={
                    isProductionReady
                      ? 'Production Ready'
                      : 'Sandbox Testing Complete'
                  }
                  size="sm"
                />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">
                {isProductionReady
                  ? 'Ready to activate live Production sync?'
                  : 'Ready to go live? Connect your Production platforms'}
              </h3>
              <p className="text-muted-foreground max-w-2xl text-xs leading-normal">
                {isProductionReady
                  ? 'Your sync flows are verified in Sandbox and your live Production connections are connected. Open Environment Settings to switch active sync runtime to Production.'
                  : 'Your sync flows have been verified cleanly in Sandbox. To begin syncing live customer data, connect your live production platforms. Your field mappings and configurations will carry over seamlessly.'}
              </p>
            </div>
            <div className="shrink-0">
              {isProductionReady ? (
                <Button
                  size="sm"
                  onClick={() =>
                    handleTabChange('settings', { section: 'environments' })
                  }
                >
                  Promote to Production
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    handleTabChange('connections', { env: 'production' })
                  }
                >
                  Connect Production Platforms
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {isGraduated && (
        <DraftResumptionBanner
          projectId={project.id}
          onResume={onCreateSyncRule}
        />
      )}

      <ProjectKeyMetrics
        totalRecordsSynced={metrics.totalRecordsSynced}
        totalErrors={metrics.totalErrors}
        jobs={jobs}
        lastSyncedAt={metrics.lastSyncedAt}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ProjectRecentActivity
          projectId={project.id}
          logs={logs}
          jobs={jobs}
          onViewAll={() => handleTabChange('activity')}
        />
        <ProjectUpcomingEvents
          jobs={jobs}
          onViewScheduler={() =>
            handleTabChange('settings', { section: 'schedule' })
          }
        />
      </div>
    </div>
  );
}
