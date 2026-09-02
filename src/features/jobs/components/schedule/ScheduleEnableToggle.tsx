import { Play, Square } from 'lucide-react';
import { useState } from 'react';

import RunConfirmModal from '@/components/sync/RunConfirmModal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ExtJob, ScheduleTogglePayload } from '@/features/jobs/hooks';
import { cn } from '@/lib/utils';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

interface ScheduleEnableToggleProps {
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
 * Individual schedules are ignored while Priority Scheduling governs the
 * project, so this hides itself behind a notice in that case rather than
 * offering a control that would silently do nothing.
 */
export default function ScheduleEnableToggle({
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
      <p className="text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 text-sm">
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

  if (schedActive) {
    return (
      <Button
        variant="outline"
        onClick={() => onScheduleToggle()}
        disabled={scheduleToggling}
        className={cn('w-full', 'border-warning/30 text-warning bg-warning/5')}
      >
        {scheduleToggling ? <Spinner /> : <Square className="fill-current" />}
        {scheduleToggling ? 'Disabling…' : 'Disable Schedule'}
      </Button>
    );
  }

  const mode = schedPaused || schedLimitPaused ? 'resume' : 'run';

  if (confirmPresentation === 'inline') {
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
    <>
      <Button onClick={() => setShowConfirm(true)}>
        <Play /> {mode === 'resume' ? 'Resume Schedule' : 'Enable Schedule'}
      </Button>
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
    </>
  );
}
