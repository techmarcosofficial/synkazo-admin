import { AlertCircle, Info, XIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { connectionsApi, type SharedSourceAcknowledgement } from '@/api/connections';
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
  sourcePlatformId?: string | null;
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
  sourcePlatformId,
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
  const [sharedSourceStatus, setSharedSourceStatus] =
    useState<SharedSourceAcknowledgement | null>(null);
  const [acknowledgingSource, setAcknowledgingSource] = useState(false);

  useEffect(() => {
    if (!isSandbox) return;
    let cancelled = false;
    void connectionsApi
      .getSharedSourceAcknowledgement(projectId)
      .then((res) => {
        if (!cancelled) setSharedSourceStatus(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSandbox, projectId]);

  const handleAcknowledgeSource = async () => {
    if (!sharedSourceStatus?.fingerprint) return;
    setAcknowledgingSource(true);
    try {
      await connectionsApi.acknowledgeSharedSource(
        projectId,
        sharedSourceStatus.fingerprint,
      );
      toast.success('Shared source account acknowledged for Sandbox sync.');
      setSharedSourceStatus((prev) =>
        prev ? { ...prev, acknowledged: true } : null,
      );
    } catch (err) {
      toast.error('Failed to acknowledge shared source.');
    } finally {
      setAcknowledgingSource(false);
    }
  };

  const isSharedSourceUnacknowledged =
    isSandbox &&
    Boolean(sharedSourceStatus?.shared && !sharedSourceStatus?.acknowledged);
  const effectiveDisabled = disabled;

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
    <div className="space-y-3 p-3">
      {isSharedSourceUnacknowledged && (
        <Alert className="border-warning/40 bg-warning/5 text-foreground px-3 py-2.5">
          <AlertCircle className="text-warning size-4 shrink-0 mt-0.5" />
          <AlertDescription className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="text-foreground font-semibold">Shared source approval needed:</strong>{' '}
              Sandbox reads from the shared live Production source account (
              {sharedSourceStatus?.accountName ?? sharedSourceStatus?.platformId ?? 'source'}
              {sharedSourceStatus?.accountIdentity ? ` ${sharedSourceStatus.accountIdentity}` : ''}
              ). Acknowledge before syncing.
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={acknowledgingSource}
              onClick={() => void handleAcknowledgeSource()}
              className="shrink-0 self-start sm:self-auto"
            >
              {acknowledgingSource ? 'Acknowledging…' : 'Acknowledge source'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!job?.isEnabled && !isLimitRunningOrDone && (
        <Alert className="border-primary/30 bg-primary/5 text-foreground px-3 py-2">
          <Info className="text-primary size-4 shrink-0" />
          <AlertDescription className="text-xs">
            <strong className="text-foreground font-semibold">
              Automatic activation on sync:
            </strong>{' '}
            This sync job is currently inactive. Starting this sync will
            automatically activate the job so records can sync between your
            platforms.
          </AlertDescription>
        </Alert>
      )}

      {!isLimitRunningOrDone && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
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
              disabled={effectiveDisabled}
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
              disabled={effectiveDisabled}
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
              disabled={effectiveDisabled}
              onFooterChange={onFooterChange}
            />
          </div>
        ) : (
          <LimitSyncModal
            embedded
            compact
            environment={environment}
            sourcePlatformId={sourcePlatformId}
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
            disabled={effectiveDisabled}
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ManualSyncContent {...props} onFooterChange={setFooterContent} />
        </div>
        {footerContent && (
          <div className="border-border/60 bg-muted/20 mt-3 flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end">
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
              <DialogTitle className="text-base leading-tight font-semibold">
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
            <DialogDescription className="text-muted-foreground text-xs">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ManualSyncContent {...props} onFooterChange={setFooterContent} />
        </div>

        {footerContent && (
          <DialogFooter className="bg-muted/20 flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end">
            {footerContent}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
