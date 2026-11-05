import { Settings } from 'lucide-react';

import { useJobDetailContext } from './context';
import JobIdentityHeader from './JobIdentityHeader';
import JobStatusDropdown from './JobStatusDropdown';

import { Button } from '@/components/ui/button';
import type { Project, ProjectEnvironment } from '@/types';

export default function JobHeader() {
  const {
    job,
    project,
    jobFieldMappings,
    hasConnection,
    isSyncing,
    toggling,
    handleToggle,
    handleStop,
    highlightStatusGuide,
    activeTab,
    handleTabChange,
  } = useJobDetailContext();
  const isSettingsOpen = activeTab === 'settings';

  const hasMatchField = jobFieldMappings.some((m) => m.matchDestKey);
  const canActivate =
    jobFieldMappings.length > 0 &&
    hasMatchField &&
    hasConnection &&
    project?.status === 'active';
  const operationalStatus = isSyncing
    ? 'running'
    : job.scheduleState === 'paused_limit_reached'
      ? 'limit_reached'
      : job.scheduleState === 'retry_pending'
        ? 'retry_pending'
        : job.scheduleState === 'paused'
          ? 'schedule_paused'
          : null;
  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;

  return (
    <JobIdentityHeader
      name={job.name}
      projectName={project?.name || 'Project'}
      sourcePlatformId={project?.sourcePlatformId ?? ''}
      destPlatformId={project?.destPlatformId ?? ''}
      sourceObject={job.sourceObject}
      destObject={job.destObject}
      syncDirection={job.syncDirection}
      lastSyncedAt={job.lastSyncedAt ?? null}
      activeEnvironment={activeEnvironment}
      operationalStatus={operationalStatus}
      statusControl={
        <JobStatusDropdown
          isActive={!!job.isEnabled}
          canActivate={canActivate}
          hasConnection={hasConnection}
          fieldMappingCount={jobFieldMappings.length}
          toggling={toggling}
          onToggle={handleToggle}
          isSyncing={isSyncing}
          onStop={handleStop}
          highlighted={highlightStatusGuide}
          align="end"
        />
      }
      action={
        <Button
          variant={isSettingsOpen ? 'default' : 'outline'}
          size="icon-sm"
          shape="pill"
          aria-label="Flow settings"
          title="Flow settings"
          aria-pressed={isSettingsOpen}
          onClick={() => handleTabChange('settings')}
        >
          <Settings aria-hidden="true" />
        </Button>
      }
    />
  );
}
