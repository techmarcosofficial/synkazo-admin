import { useProjectDetailContext } from '../context';
import ProjectKeyMetrics from '../overview/ProjectKeyMetrics';
import ProjectRecentActivity from '../overview/ProjectRecentActivity';
import ProjectUpcomingEvents from '../overview/ProjectUpcomingEvents';

import { getProjectOverviewMetrics } from '@/features/projects/lib/projectOverview';

export default function OverviewTab() {
  const { project, jobs, logs, handleTabChange } = useProjectDetailContext();
  const metrics = getProjectOverviewMetrics(project, jobs);

  return (
    <div className="space-y-6">
      <ProjectKeyMetrics
        totalRecordsSynced={metrics.totalRecordsSynced}
        totalErrors={metrics.totalErrors}
        jobs={jobs}
        lastSyncedAt={metrics.lastSyncedAt}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ProjectRecentActivity
          projectId={project.id}
          destinationPlatformId={project.destPlatformId}
          logs={logs}
          jobs={jobs}
          onViewAll={() => handleTabChange('activity')}
        />
        <ProjectUpcomingEvents
          destinationPlatformId={project.destPlatformId}
          jobs={jobs}
          onViewScheduler={() => handleTabChange('scheduler')}
        />
      </div>
    </div>
  );
}
