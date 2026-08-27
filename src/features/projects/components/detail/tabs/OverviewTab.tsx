import { useProjectDetailContext } from '../context';
import ProjectAttentionRequired from '../overview/ProjectAttentionRequired';
import ProjectConfigChecklist from '../overview/ProjectConfigChecklist';
import ProjectDetailsSection from '../overview/ProjectDetailsSection';
import ProjectHealthSummary from '../overview/ProjectHealthSummary';
import ProjectKeyMetrics from '../overview/ProjectKeyMetrics';
import ProjectQuickActions from '../overview/ProjectQuickActions';
import ProjectRecentActivity from '../overview/ProjectRecentActivity';

import { Card, CardContent } from '@/components/ui/card';
import { deriveProjectHealth } from '@/features/projects/lib/projectSetupState';

export default function OverviewTab() {
  const {
    projectId,
    project,
    jobs,
    connections,
    logs,
    associationRules,
    totalRecordsSynced,
    totalErrors,
    handleTabChange,
    onCreateSyncRule,
    setConnectionsCache,
    refetch,
  } = useProjectDetailContext();

  const { level, issues } = deriveProjectHealth({
    connections,
    jobs,
    totalErrors,
    logs,
  });

  return (
    <div className="space-y-6">
      <ProjectHealthSummary level={level} issues={issues} />

      <ProjectKeyMetrics
        totalRecordsSynced={totalRecordsSynced}
        totalErrors={totalErrors}
        jobs={jobs}
        logs={logs}
        lastSyncedAt={project.lastSyncedAt}
      />

      <ProjectAttentionRequired
        issues={issues}
        onIssueClick={handleTabChange}
      />
      <Card>
        <CardContent className="space-y-4">
          <ProjectQuickActions
            projectId={projectId}
            connections={connections}
            jobs={jobs}
            onCreateSyncRule={onCreateSyncRule}
            setConnectionsCache={setConnectionsCache}
            refetch={refetch}
            handleTabChange={handleTabChange}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProjectRecentActivity
              logs={logs}
              jobs={jobs}
              onViewAll={() => handleTabChange('activity')}
            />
            <ProjectConfigChecklist
              project={project}
              connections={connections}
              jobs={jobs}
              associationRules={associationRules}
              onNavigate={handleTabChange}
            />
          </div>
        </CardContent>
      </Card>

      <ProjectDetailsSection project={project} />
    </div>
  );
}
