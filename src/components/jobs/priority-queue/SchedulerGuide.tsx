import { useGuideSpot, useIsGuideStep, type GuideSpot } from '@/features/guide';

/**
 * First-run guide on the project scheduler (the last setup step). It first
 * shows both ways to schedule side by side, then walks whichever one the
 * user picks through to Save. Renders nothing.
 */
export default function SchedulerGuide({
  projectId,
  priority,
  queuedJobs,
  composerOpen,
  hasChanges,
}: {
  projectId: string;
  /** Priority scheduler switched on (saved or drafted). */
  priority: boolean;
  /** Jobs in the queue, saved or staged. */
  queuedJobs: number;
  composerOpen: boolean;
  hasChanges: boolean;
}) {
  const guiding = useIsGuideStep(projectId, 'schedule');

  let spot: GuideSpot | null = null;
  if (guiding) {
    if (!priority && !hasChanges) {
      spot = {
        id: 'schedule-choose',
        target: '[data-guide="priority-toggle"]',
        targetMode: 'control',
        extras: [
          { target: '[data-guide="priority-card-header"]', mode: 'area' },
          { target: '[data-guide="scheduler-configure"]', mode: 'control', all: true },
        ],
        placement: 'bottom',
        title: 'Two ways to schedule',
        body: 'Priority scheduler: switch on to run several jobs in a set order on one shared timer, best for bulk. Configure: give a single job its own schedule.',
      };
    } else if (!priority) {
      spot = {
        id: 'schedule-save-individual',
        target: '[data-guide="scheduler-save"]',
        placement: 'top',
        title: 'Save your schedule',
        body: 'Your job’s schedule is ready. Save to turn it on.',
      };
    } else if (queuedJobs === 0) {
      spot = composerOpen
        ? {
            id: 'schedule-queue-apply',
            target: ['[data-guide="scheduler-apply"]', '[data-guide="queue-composer"]'],
            placement: 'bottom',
            title: 'Pick your sync job, then apply',
            body: 'Choose the job to add. Jobs in the queue run top to bottom each cycle.',
          }
        : {
            id: 'schedule-queue-add',
            target: '[data-guide="scheduler-add-job"]',
            placement: 'bottom',
            title: 'Add your sync job to the queue',
            body: 'The priority scheduler runs queued jobs in order on one shared schedule.',
          };
    } else if (hasChanges) {
      spot = {
        id: 'schedule-queue-save',
        target: '[data-guide="scheduler-save"]',
        extras: [{ target: '[data-guide="queue-schedule"]', mode: 'panel' }],
        placement: 'top',
        title: 'Set how often, then save',
        body: 'Check the queue’s frequency in the schedule card, then save to start it.',
      };
    }
  }
  useGuideSpot(spot && { ...spot, step: 'schedule' });
  return null;
}
