import { ArrowRight, Clock } from 'lucide-react';
import { useState } from 'react';

import { useProjectDetailContext } from '../context';
import ProjectKeyMetrics from '../overview/ProjectKeyMetrics';
import ProjectRecentActivity from '../overview/ProjectRecentActivity';
import ProjectUpcomingEvents from '../overview/ProjectUpcomingEvents';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DraftResumptionBanner } from '@/features/journey';
import { getProjectOverviewMetrics } from '@/features/projects/lib/projectOverview';

export default function OverviewTab() {
  const { project, jobs, logs, handleTabChange, onCreateSyncRule } =
    useProjectDetailContext();
  const metrics = getProjectOverviewMetrics(project, jobs);

  return (
    <div className="space-y-6">
      <DraftResumptionBanner
        projectId={project.id}
        onResume={onCreateSyncRule}
      />

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
