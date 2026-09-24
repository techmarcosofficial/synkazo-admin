import { useState, type ReactNode } from 'react';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import LimitSyncModal from '@/components/sync/LimitSyncModal';
import RunConfirmModal from '@/components/sync/RunConfirmModal';
import SyncAllTab from '@/components/sync/SyncAllTab';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup } from '@/components/ui/radio-group';
import type { ExtJob } from '@/features/jobs/hooks/useJobDetail';

interface StartSyncModalProps {
  projectId: string;
  jobId: string;
  job: ExtJob;
  hasBaseline: boolean;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline: () => void;
  onClose: () => void;
  onRunNow: () => void;
  onLimitSyncStarted?: () => void;
  onLimitSyncDone: () => void;
  onSyncAll: (range: { startDate?: string; endDate?: string }) => void;
  /** Live status rendered directly above the all-records action row. */
  runProgress?: ReactNode;
  disabled?: boolean;
  /** Renders the same run workflow directly inside a parent surface. */
  embedded?: boolean;
}

function ManualSyncContent({
  projectId,
  jobId,
  job,
  hasBaseline,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
  onClose,
  onRunNow,
  onLimitSyncStarted,
  onLimitSyncDone,
  onSyncAll,
  runProgress,
  disabled = false,
  embedded = false,
}: StartSyncModalProps) {
  const [runType, setRunType] = useState<'all' | 'limited'>('all');
  const [showIncrementalRun, setShowIncrementalRun] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">What records do you want to sync?</p>

      <RadioGroup
        value={runType}
        onValueChange={(value) => setRunType(value as 'all' | 'limited')}
        className="grid gap-2 sm:grid-cols-2"
      >
        <ChoiceCardItem
          value="all"
          id="manual-run-all"
          title="All records"
          description="Sync all available records"
          disabled={disabled}
        />
        <ChoiceCardItem
          value="limited"
          id="manual-run-limited"
          title="Limited run"
          description="Sync a controlled number of records"
          disabled={disabled}
        />
      </RadioGroup>

      <div className="min-w-0">
        {runType === 'all' ? (
          <div className="space-y-4">
            <SyncAllTab
              projectId={projectId}
              jobId={jobId}
              job={job}
              onConfirm={onSyncAll}
              pipelineRequired={pipelineRequired}
              pipelineConfigured={pipelineConfigured}
              onGoToPipeline={onGoToPipeline}
              disabled={disabled}
            >
              {runProgress}
            </SyncAllTab>
          </div>
        ) : (
          <LimitSyncModal
            embedded
            compact
            projectId={projectId}
            jobId={jobId}
            job={job}
            onClose={embedded ? () => setRunType('all') : onClose}
            onStarted={onLimitSyncStarted}
            onDone={onLimitSyncDone}
            pipelineRequired={pipelineRequired}
            pipelineConfigured={pipelineConfigured}
            onGoToPipeline={onGoToPipeline}
            disabled={disabled}
          />
        )}
      </div>

      {showIncrementalRun && (
        <RunConfirmModal
          mode="runNow"
          projectId={projectId}
          jobId={jobId}
          job={job}
          onClose={() => setShowIncrementalRun(false)}
          onConfirm={() => {
            setShowIncrementalRun(false);
            onRunNow();
          }}
          pipelineRequired={pipelineRequired}
          pipelineConfigured={pipelineConfigured}
          onGoToPipeline={onGoToPipeline}
        />
      )}
    </div>
  );
}

export default function StartSyncModal(props: StartSyncModalProps) {
  if (props.embedded) return <ManualSyncContent {...props} />;

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent size="md" className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Run manually</DialogTitle>
          <DialogDescription>
            Sync data now without changing the automatic schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          <ManualSyncContent {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
