import { useState } from 'react';

import RunConfirmModal from '@/components/sync/RunConfirmModal';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { ExtJob, ScheduleTogglePayload } from '@/features/jobs/hooks';
import { cn } from '@/lib/utils';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

interface ScheduleEnableToggleProps {
  className?: string;
  projectId: string;
  jobId: string;
  job: ExtJob;
  scheduleToggling: boolean;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline?: () => void;
  onScheduleToggle: (payload?: ScheduleTogglePayload) => void;
  /** 'inline' renders the enable/resume confirmation as plain content in the
   *  current dialog (used inside the Start Sync modal's own Schedule Sync
   *  tab). 'dialog' pops its own Dialog instead, for quick-access placements
   *  that aren't already inside a modal (e.g. the job's Schedule tab). */
  confirmPresentation?: 'inline' | 'dialog';
  /** Only meaningful with confirmPresentation="inline" — the Cancel button on
   *  the embedded confirmation closes the modal it's already inside. */
  onCancelInline?: () => void;
}

/**
 * The enable/disable control for a job's independent schedule — shared so the
 * Start Sync modal's "Schedule Sync" tab and the job's Schedule tab's inline
 * quick-toggle stay pixel- and behavior-identical instead of drifting apart.
 * Rendered as a Switch/toggle since it represents an enabled/disabled state.
 */
export default function ScheduleEnableToggle({
  className,
  projectId,
  jobId,
  job,
  scheduleToggling,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
  onScheduleToggle,
  confirmPresentation = 'dialog',
  onCancelInline,
}: ScheduleEnableToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';

  if (priorityModeActive) {
    return (
      <p className="text-muted-foreground bg-muted/40 rounded-4xl border px-4 py-3 text-sm">
        Priority scheduling is enabled.
      </p>
    );
  }

  const schedPaused = job.scheduleState === 'paused';
  const schedLimitPaused = job.scheduleState === 'paused_limit_reached';
  const schedActive =
    job.syncEnabled &&
    (job.scheduleState === 'active' ||
      job.scheduleState === 'retry_pending' ||
      job.scheduleState === 'resume_pending');

  const mode = schedPaused || schedLimitPaused ? 'resume' : 'run';

  if (confirmPresentation === 'inline' && !schedActive) {
    return (
      <RunConfirmModal
        embedded
        mode={mode}
        projectId={projectId}
        jobId={jobId}
        job={job}
        onConfirm={onScheduleToggle}
        onClose={onCancelInline ?? (() => {})}
        pipelineRequired={pipelineRequired}
        pipelineConfigured={pipelineConfigured}
        onGoToPipeline={onGoToPipeline}
      />
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <label
        htmlFor={`schedule-switch-${jobId}`}
        className="text-xs font-medium text-foreground cursor-pointer select-none flex items-center gap-1.5"
      >
        {scheduleToggling && <Spinner className="size-3" />}
        <span>
          {scheduleToggling
            ? schedActive
              ? 'Pausing…'
              : 'Enabling…'
            : schedActive
              ? 'Schedule active'
              : 'Schedule paused'}
        </span>
      </label>
      <Switch
        id={`schedule-switch-${jobId}`}
        checked={Boolean(schedActive)}
        disabled={scheduleToggling}
        onCheckedChange={(checked) => {
          if (!checked) {
            onScheduleToggle();
          } else {
            setShowConfirm(true);
          }
        }}
        aria-label={schedActive ? 'Pause schedule' : 'Enable schedule'}
      />
      {showConfirm && (
        <RunConfirmModal
          mode={mode}
          projectId={projectId}
          jobId={jobId}
          job={job}
          onConfirm={(payload) => {
            setShowConfirm(false);
            onScheduleToggle(payload);
          }}
          onClose={() => setShowConfirm(false)}
          pipelineRequired={pipelineRequired}
          pipelineConfigured={pipelineConfigured}
          onGoToPipeline={onGoToPipeline}
        />
      )}
    </div>
  );
}
