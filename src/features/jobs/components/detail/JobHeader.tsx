import { formatDistanceToNow } from 'date-fns';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';

import { useJobDetailContext } from './context';
import JobStatusDropdown from './JobStatusDropdown';

import { PlatformIcon } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatEntityLabel } from '@/features/projects/lib/syncJobSummary';

export default function JobHeader() {
  const {
    job,
    project,
    jobFieldMappings,
    hasConnection,
    isSyncing,
    toggling,
    handleToggle,
  } = useJobDetailContext();

  const isActive = !!job.isEnabled;
  const hasMatchField = jobFieldMappings.some((m) => m.matchDestKey);
  const isProjectActive = project?.status === 'active';
  const canActivate =
    jobFieldMappings.length > 0 &&
    hasMatchField &&
    hasConnection &&
    isProjectActive;
  const schedPaused = job.scheduleState === 'paused';
  const schedLimitPaused = job.scheduleState === 'paused_limit_reached';
  const schedRetrying = job.scheduleState === 'retry_pending';
  const twoWay = job.syncDirection === 'two_way';
  const DirectionIcon = twoWay ? ArrowLeftRight : ArrowRight;
  const lastSyncedLabel = job.lastSyncedAt
    ? formatDistanceToNow(new Date(job.lastSyncedAt), {
        addSuffix: true,
      }).replace('about ', '')
    : 'Never synced';
  const operationalStatus = isSyncing
    ? 'running'
    : schedLimitPaused
      ? 'limit_reached'
      : schedRetrying
        ? 'retry_pending'
        : schedPaused
          ? 'schedule_paused'
          : null;

  return (
    <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <PlatformIcon
            platformId={project?.sourcePlatformId ?? ''}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
          <DirectionIcon className="text-muted-foreground size-4 shrink-0" />
          <PlatformIcon
            platformId={project?.destPlatformId ?? ''}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {job.name}
            </h1>
            <JobStatusDropdown
              isActive={isActive}
              canActivate={canActivate}
              hasConnection={hasConnection}
              fieldMappingCount={jobFieldMappings.length}
              toggling={toggling}
              onToggle={handleToggle}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-sm leading-5">
            <span>{project?.name || 'Project'}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate">
                {formatEntityLabel(job.sourceObject)}
              </span>
              <DirectionIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {formatEntityLabel(job.destObject)}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{lastSyncedLabel}</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <StatusBadge status={twoWay ? 'two_way' : 'one_way'} size="lg" />
        {project?.active_environment && (
          <StatusBadge status={project.active_environment} size="sm" />
        )}
        {operationalStatus && (
          <StatusBadge status={operationalStatus} size="sm" />
        )}
      </div>
    </div>
  );
}
