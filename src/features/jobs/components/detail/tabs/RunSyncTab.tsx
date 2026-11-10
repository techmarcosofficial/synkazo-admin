import { Info } from 'lucide-react';

import { useJobDetailContext } from '../context';

import HeadingPair from '@/components/shared/HeadingPair';
import StatusBadge from '@/components/shared/StatusBadge';
import StartSyncModal from '@/components/sync/StartSyncModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useManualSyncAvailability } from '@/features/jobs/hooks/useManualSyncAvailability';
import type { Project, ProjectEnvironment } from '@/types';

// The manual run workflow ("Sync now") as its own tab: limited or full run,
// direction for two-way flows, and a limited run's live result.
export default function RunSyncTab() {
  const {
    projectId,
    job,
    project,
    pipelineRequired,
    pipelineConfigured,
    refetch,
    beginTracking,
    handleRunNow,
    handleSyncAll,
    handleTabChange,
  } = useJobDetailContext();
  const { canRunJob, syncBlocked, hasBaseline, blockedReason } =
    useManualSyncAvailability();

  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;
  const isSandbox = activeEnvironment === 'sandbox';
  const goToOverview = () => handleTabChange('overview');

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1 py-1">
        <HeadingPair
          title="Run Sync"
          subtitle="Sync data now without changing the automatic schedule."
        />
        {activeEnvironment && (
          <StatusBadge
            status={activeEnvironment}
            label={isSandbox ? 'Sandbox' : 'Production'}
            title={
              isSandbox
                ? 'Operating in Sandbox — Live customer data is not affected'
                : 'Production Sync active'
            }
            size="sm"
          />
        )}
      </div>

      {blockedReason && (
        <Alert className="py-2.5" role="status">
          <Info />
          <AlertDescription>{blockedReason}</AlertDescription>
        </Alert>
      )}

      {canRunJob && (
        <div className="bg-card border-border/60 overflow-hidden rounded-3xl border">
          <StartSyncModal
            embedded
            projectId={projectId}
            jobId={job.id}
            job={job}
            environment={activeEnvironment}
            sourcePlatformId={project?.sourcePlatformId}
            hasBaseline={hasBaseline}
            pipelineRequired={pipelineRequired}
            pipelineConfigured={pipelineConfigured}
            disabled={syncBlocked}
            onGoToPipeline={() => handleTabChange('pipeline')}
            onClose={goToOverview}
            onRunNow={() => {
              void handleRunNow();
              goToOverview();
            }}
            onLimitSyncStarted={() => {
              void beginTracking();
            }}
            onLimitSyncDone={() => {
              void refetch();
            }}
            onSyncAll={(range) => {
              void handleSyncAll(undefined, range);
            }}
          />
        </div>
      )}
    </div>
  );
}
