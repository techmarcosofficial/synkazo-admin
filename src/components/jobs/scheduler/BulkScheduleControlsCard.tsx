import { Pause, Play } from 'lucide-react';
import { useState } from 'react';

import { isScheduleActive, isSchedulePaused } from './scheduleSummary';

import { jobsApi } from '@/api/jobs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import type { Job } from '@/types';

export function getBulkScheduleCounts(jobs: Job[]) {
  return {
    pausable: jobs.filter(isScheduleActive).length,
    resumable: jobs.filter(isSchedulePaused).length,
  };
}

export default function BulkScheduleControlsCard({
  projectId,
  jobs,
  priorityMode,
  onChanged,
}: {
  projectId: string;
  jobs: Job[];
  priorityMode: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const { confirm } = useConfirmDialog();
  const [busyAction, setBusyAction] = useState<'pause' | 'resume' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const counts = getBulkScheduleCounts(jobs);

  const runAction = async (action: 'pause' | 'resume') => {
    setBusyAction(action);
    setError(null);
    try {
      const result =
        action === 'pause'
          ? await jobsApi.pauseAllJobs(projectId)
          : await jobsApi.resumeAllJobs(projectId);
      showToast.success(
        `${result.affected} job ${result.affected === 1 ? 'schedule' : 'schedules'} ${
          action === 'pause' ? 'paused' : 'resumed'
        }.`,
      );
      await onChanged();
    } catch {
      setError(
        `Job schedules could not be ${action === 'pause' ? 'paused' : 'resumed'}. Please try again.`,
      );
      showToast.error('Something went wrong. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const requestPause = () => {
    confirm({
      variant: 'warning',
      title: `Pause ${counts.pausable} active ${counts.pausable === 1 ? 'schedule' : 'schedules'}?`,
      description:
        'Scheduled runs will stop. Each job keeps its current cadence and can be resumed later.',
      confirmLabel: 'Pause schedules',
      onConfirm: () => runAction('pause'),
    });
  };

  const requestResume = () => {
    confirm({
      variant: 'info',
      title: `Resume ${counts.resumable} paused ${counts.resumable === 1 ? 'schedule' : 'schedules'}?`,
      description:
        'Each job will continue from its preserved individual schedule configuration.',
      confirmLabel: 'Resume schedules',
      onConfirm: () => runAction('resume'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project schedule controls</CardTitle>
        <CardDescription>
          Pause or resume all eligible individual job schedules together.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorityMode && (
          <Alert>
            <AlertDescription>
              These controls update the saved individual schedules. Priority
              mode continues to override them until it is disabled.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={requestPause}
            disabled={busyAction !== null || counts.pausable === 0}
          >
            {busyAction === 'pause' ? <Spinner /> : <Pause />}
            Pause active ({counts.pausable})
          </Button>
          <Button
            onClick={requestResume}
            disabled={busyAction !== null || counts.resumable === 0}
          >
            {busyAction === 'resume' ? <Spinner /> : <Play />}
            Resume paused ({counts.resumable})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
