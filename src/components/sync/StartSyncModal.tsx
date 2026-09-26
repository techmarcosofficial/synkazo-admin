import { ShieldCheck, XIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import StatusBadge from '@/components/shared/StatusBadge';
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
import type { ProjectEnvironment } from '@/types';

interface StartSyncModalProps {
  projectId: string;
  jobId: string;
  job: ExtJob;
  hasBaseline: boolean;
  environment?: ProjectEnvironment;
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
  environment,
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
  const [runType, setRunType] = useState<'all' | 'limited'>(
    !hasBaseline ? 'limited' : 'all',
  );
  const [showIncrementalRun, setShowIncrementalRun] = useState(false);
  const isSandbox = environment === 'sandbox';

  return (
    <div className="space-y-4">
      {isSandbox && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-muted/50 border border-border/60 px-3.5 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-warning shrink-0" />
          <span>
            <strong className="text-foreground">Operating in Sandbox:</strong>{' '}
            This run tests data movement using your sandbox connections. No live
            production records will be modified.
          </span>
        </div>
      )}

      <p className="text-sm font-medium">What records do you want to sync?</p>

      <RadioGroup
        value={runType}
        onValueChange={(value) => setRunType(value as 'all' | 'limited')}
        className="grid gap-2 sm:grid-cols-2"
      >
        <ChoiceCardItem
          value="limited"
          id="manual-run-limited"
          title="Limited run"
          description={
            !hasBaseline
              ? 'Recommended for first test run'
              : 'Sync a controlled number of records'
          }
          disabled={disabled}
        />
        <ChoiceCardItem
          value="all"
          id="manual-run-all"
          title="All records"
          description={
            !hasBaseline
              ? 'Initial sync: import all historical records'
              : 'Sync all available records'
          }
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
          environment={environment}
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

  const isSandbox = props.environment === 'sandbox';

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        size="md"
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 rounded-4xl"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-4 border-b px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-base font-semibold leading-tight">
                Run manually
              </DialogTitle>
              {props.environment && (
                <StatusBadge
                  status={props.environment}
                  label={
                    isSandbox ? 'Sandbox (Test Mode)' : 'Production (Live)'
                  }
                  title={
                    isSandbox
                      ? 'Operating in Sandbox — Live customer data is not affected'
                      : 'Live Production Sync active'
                  }
                  size="sm"
                />
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Sync data now without changing the automatic schedule.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="bg-secondary shrink-0"
            onClick={props.onClose}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <ManualSyncContent {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
