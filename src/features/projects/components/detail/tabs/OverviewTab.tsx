import { useProjectDetailContext } from '../context';
import ProjectKeyMetrics from '../overview/ProjectKeyMetrics';
import ProjectRecentActivity from '../overview/ProjectRecentActivity';
import ProjectUpcomingEvents from '../overview/ProjectUpcomingEvents';

import { DraftResumptionBanner } from '@/features/journey';
import { selectProjectOnboardingStage } from '@/features/onboarding';
import { getProjectOverviewMetrics } from '@/features/projects/lib/projectOverview';

export default function OverviewTab() {
  const {
    project,
    jobs,
    logs,
    hasBothConnections,
    handleTabChange,
    onCreateSyncRule,
  } = useProjectDetailContext();

  const metrics = getProjectOverviewMetrics(project, jobs);
  const isGraduated =
    selectProjectOnboardingStage({
      hasBothConnections,
      hasJobs: jobs.length > 0,
      jobs,
    }) === 'complete';

  return (
    <div className="space-y-6">
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
