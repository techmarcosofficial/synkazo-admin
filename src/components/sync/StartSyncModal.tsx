import { ChevronDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import LimitSyncModal from '@/components/sync/LimitSyncModal';
import RunConfirmModal from '@/components/sync/RunConfirmModal';
import SyncAllTab from '@/components/sync/SyncAllTab';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup } from '@/components/ui/radio-group';
import type { ExtJob } from '@/features/jobs/hooks/useJobDetail';
import { cn } from '@/lib/utils';

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
  onLimitSyncDone: () => void;
  onSyncAll: (range: { startDate?: string; endDate?: string }) => void;
  disabled?: boolean;
  /** Renders the same run workflow directly inside the Sync & Schedule page. */
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
  onLimitSyncDone,
  onSyncAll,
  disabled = false,
  embedded = false,
}: StartSyncModalProps) {
  const [runType, setRunType] = useState<'all' | 'limited'>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showIncrementalRun, setShowIncrementalRun] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">What records do you want to sync?</p>

        {runType === 'all' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            Advanced options
            <ChevronDown
              className={cn(
                'transition-transform',
                advancedOpen && 'rotate-180',
              )}
            />
          </Button>
        )}
      </div>

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
        />
        <ChoiceCardItem
          value="limited"
          id="manual-run-limited"
          title="Limited run"
          description="Sync a controlled number of records"
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
            />

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleContent className="pt-2">
                <div className="bg-muted/30 flex flex-col gap-3 rounded-4xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Sync only new or updated records
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {hasBaseline
                        ? 'Continue incrementally from the last successful sync.'
                        : 'A full sync is recommended first to establish a baseline.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setShowIncrementalRun(true)}
                    disabled={disabled}
                  >
                    <RefreshCw /> Run changes only
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <LimitSyncModal
            embedded
            compact
            projectId={projectId}
            jobId={jobId}
            job={job}
            onClose={embedded ? () => setRunType('all') : onClose}
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
        </DialogHeader>
        <div className="overflow-y-auto">
          <ManualSyncContent {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
