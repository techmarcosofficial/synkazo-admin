import { Info, XIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import StatusBadge from '@/components/shared/StatusBadge';
import LimitSyncModal from '@/components/sync/LimitSyncModal';
import RunConfirmModal from '@/components/sync/RunConfirmModal';
import SyncAllTab from '@/components/sync/SyncAllTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  disabled = false,
  embedded = false,
  onFooterChange,
}: StartSyncModalProps & { onFooterChange?: (footer: ReactNode) => void }) {
  const isSandbox = environment === 'sandbox';
  const [runType, setRunType] = useState<'all' | 'limited'>(
    !hasBaseline ? 'limited' : 'all',
  );
  const [limitSyncStep, setLimitSyncStep] = useState<
    'config' | 'running' | 'done'
  >('config');
  const [showIncrementalRun, setShowIncrementalRun] = useState(false);

  const isLimitRunningOrDone =
    runType === 'limited' && limitSyncStep !== 'config';

  return (
    <div className="space-y-3">
      {!job?.isEnabled && !isLimitRunningOrDone && (
        <Alert className="border-primary/30 bg-primary/5 text-foreground py-2 px-3">
          <Info className="size-4 text-primary shrink-0" />
          <AlertDescription className="text-xs">
            <strong className="font-semibold text-foreground">
              Automatic activation on sync:
            </strong>{' '}
            This sync job is currently inactive. Starting this sync will
            automatically activate the job so records can sync between your platforms.
          </AlertDescription>
        </Alert>
      )}

      {!isLimitRunningOrDone && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What records do you want to sync?
          </p>

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
                !hasBaseline && isSandbox
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
        </div>
      )}

      <div className="min-w-0">
        {runType === 'all' ? (
          <div className="space-y-3">
            <SyncAllTab
              projectId={projectId}
              jobId={jobId}
              job={job}
              onConfirm={onSyncAll}
              onClose={onClose}
              pipelineRequired={pipelineRequired}
              pipelineConfigured={pipelineConfigured}
              onGoToPipeline={onGoToPipeline}
              disabled={disabled}
              onFooterChange={onFooterChange}
            />
          </div>
        ) : (
          <LimitSyncModal
            embedded
            compact
            environment={environment}
            projectId={projectId}
            jobId={jobId}
            job={job}
            onClose={onClose}
            onStarted={onLimitSyncStarted}
            onDone={onLimitSyncDone}
            onStepChange={setLimitSyncStep}
            pipelineRequired={pipelineRequired}
            pipelineConfigured={pipelineConfigured}
            onGoToPipeline={onGoToPipeline}
            disabled={disabled}
            onFooterChange={onFooterChange}
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
  const [footerContent, setFooterContent] = useState<ReactNode>(null);
  const isSandbox = props.environment === 'sandbox';

  if (props.embedded) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ManualSyncContent {...props} onFooterChange={setFooterContent} />
        </div>
        {footerContent && (
          <div className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-3 mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footerContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        size="md"
        padding="none"
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-3xl sm:rounded-4xl"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-4 border-b px-5 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3.5">
          <ManualSyncContent {...props} onFooterChange={setFooterContent} />
        </div>

        {footerContent && (
          <DialogFooter className="shrink-0 border-t bg-muted/20 px-5 py-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footerContent}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
