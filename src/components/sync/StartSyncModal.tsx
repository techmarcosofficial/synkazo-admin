import { format } from 'date-fns';
import { RefreshCw, Square } from 'lucide-react';
import { useState } from 'react';

import LimitSyncModal from '@/components/sync/LimitSyncModal';
import RunConfirmModal from '@/components/sync/RunConfirmModal';
import SyncAllTab from '@/components/sync/SyncAllTab';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ExtJob,
  ScheduleTogglePayload,
} from '@/features/jobs/hooks/useJobDetail';
import { formatSchedule } from '@/features/jobs/utils';
import { cn } from '@/lib/utils';

interface StartSyncModalProps {
  projectId: string;
  jobId: string;
  job: ExtJob;
  hasBaseline: boolean;
  scheduleToggling: boolean;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline: () => void;
  onClose: () => void;
  onLimitSyncDone: () => void;
  onSyncAll: (range: { startDate?: string; endDate?: string }) => void;
  onScheduleToggle: (payload?: ScheduleTogglePayload) => void;
}

export default function StartSyncModal({
  projectId,
  jobId,
  job,
  hasBaseline,
  scheduleToggling,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
  onClose,
  onLimitSyncDone,
  onSyncAll,
  onScheduleToggle,
}: StartSyncModalProps) {
  const [tab, setTab] = useState(hasBaseline ? 'schedule' : 'all');

  const schedPaused = job.scheduleState === 'paused';
  const schedLimitPaused = job.scheduleState === 'paused_limit_reached';
  const schedActive =
    job.syncEnabled &&
    (job.scheduleState === 'active' ||
      job.scheduleState === 'retry_pending' ||
      job.scheduleState === 'resume_pending');
  const scheduleStatusLabel =
    job.scheduleState === 'retry_pending'
      ? 'Retrying after an interruption'
      : job.scheduleState === 'resume_pending'
        ? 'Catching up on missed changes'
        : 'Active';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Start Sync</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="custom">Custom Sync</TabsTrigger>
            <TabsTrigger value="all">Sync All</TabsTrigger>
            <TabsTrigger value="schedule">Schedule Sync</TabsTrigger>
          </TabsList>

          <div className="flex-1 space-y-6 overflow-y-auto pt-4">
            <TabsContent value="custom" className="space-y-6">
              <LimitSyncModal
                embedded
                projectId={projectId}
                jobId={jobId}
                job={job}
                onClose={onClose}
                onDone={onLimitSyncDone}
                pipelineRequired={pipelineRequired}
                pipelineConfigured={pipelineConfigured}
                onGoToPipeline={onGoToPipeline}
              />
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <SyncAllTab
                projectId={projectId}
                jobId={jobId}
                job={job}
                onConfirm={onSyncAll}
                pipelineRequired={pipelineRequired}
                pipelineConfigured={pipelineConfigured}
                onGoToPipeline={onGoToPipeline}
              />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <div className="overflow-hidden rounded-xl border">
                <div className="bg-muted/40 flex items-center justify-between border-b px-4 py-3">
                  <span className="text-muted-foreground text-xs">
                    Current Schedule
                  </span>
                  <span className="text-sm font-semibold">
                    Runs {formatSchedule(job)}
                  </span>
                </div>
                <div className="bg-muted/40 flex items-center justify-between px-4 py-3">
                  <span className="text-muted-foreground text-xs">
                    Next Run
                  </span>
                  <span className="text-sm font-semibold">
                    {job.nextRunAt
                      ? format(new Date(job.nextRunAt), 'MMM d, yyyy · h:mm a')
                      : 'Not yet scheduled'}
                  </span>
                </div>
              </div>

              {schedActive ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border">
                    <div className="bg-muted/40 flex items-center gap-3 px-4 py-3">
                      <div className="bg-success/10 flex size-8 items-center justify-center rounded-lg">
                        <RefreshCw className="text-success size-4" />
                      </div>
                      <p className="text-sm font-semibold">
                        Schedule is {scheduleStatusLabel.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => onScheduleToggle()}
                    disabled={scheduleToggling}
                    className={cn(
                      'w-full',
                      'border-warning/30 text-warning bg-warning/5',
                    )}
                  >
                    {scheduleToggling ? (
                      <Spinner />
                    ) : (
                      <Square className="fill-current" />
                    )}
                    {scheduleToggling ? 'Disabling…' : 'Disable Schedule'}
                  </Button>
                </div>
              ) : (
                <RunConfirmModal
                  embedded
                  mode={schedPaused || schedLimitPaused ? 'resume' : 'run'}
                  projectId={projectId}
                  jobId={jobId}
                  job={job}
                  onConfirm={onScheduleToggle}
                  onClose={onClose}
                  pipelineRequired={pipelineRequired}
                  pipelineConfigured={pipelineConfigured}
                  onGoToPipeline={onGoToPipeline}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
