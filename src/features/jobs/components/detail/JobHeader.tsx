import {
  ArrowRight,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { useJobDetailContext } from './context';
import JobStatusDropdown from './JobStatusDropdown';

import { BackLink } from '@/components/shared/PageHeader';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import StartSyncModal from '@/components/sync/StartSyncModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSchedule } from '@/features/jobs/utils';

export default function JobHeader() {
  const {
    projectId,
    job,
    project,
    jobFieldMappings,
    hasConnection,
    runLogs,
    pipelineRequired,
    pipelineConfigured,
    isSyncing,
    stopping,
    toggling,
    scheduleToggling,
    cancellingQueue,
    retryingQueue,
    activeRunLog,
    upgradeDialog,
    setUpgradeDialog,
    handleToggle,
    handleStop,
    handleCancelQueue,
    handleRetryQueue,
    handleScheduleToggle,
    handleSyncAll,
    beginTracking,
    handleTabChange,
  } = useJobDetailContext();

  const [showStartSync, setShowStartSync] = useState(false);

  const isActive = !!job.isEnabled;
  const hasMatchField = jobFieldMappings.some((m) => m.matchDestKey);
  const isProjectActive = project?.status === 'active';
  const canActivate =
    jobFieldMappings.length > 0 &&
    hasMatchField &&
    hasConnection &&
    isProjectActive;
  // Whether an incremental sync has anything to filter against yet — an incremental run
  // before any full sync has completed returns 0 records every time (see item 12), so the
  // button is disabled and demoted until there's a baseline to sync "since".
  const hasBaseline = !!job.lastSyncedAt;
  const schedPaused = job.scheduleState === 'paused';
  const schedLimitPaused = job.scheduleState === 'paused_limit_reached';
  const schedRetrying = job.scheduleState === 'retry_pending';

  return (
    <>
      <BackLink
        label="Back to Project"
        to={`/projects/${projectId}`}
        className="pt-3.5 pb-1.5"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{job.name}</h1>

            <JobStatusDropdown
              isActive={isActive}
              canActivate={canActivate}
              hasConnection={hasConnection}
              fieldMappingCount={jobFieldMappings.length}
              toggling={toggling}
              onToggle={handleToggle}
            />

            {isSyncing && (
              <Badge className="bg-muted text-muted-foreground gap-1.5 rounded-full font-semibold">
                <RefreshCw className="text-info size-2.5 animate-spin" />
                {stopping ? 'Stopping…' : 'Syncing…'}
              </Badge>
            )}
            {schedPaused && !isSyncing && (
              <Badge
                className="bg-muted text-muted-foreground gap-1.5 rounded-full font-semibold"
                title="Schedule is paused — automatic runs are disabled. Enable in Settings tab."
              >
                <span className="bg-paused size-1.5 rounded-full" />
                Schedule paused
              </Badge>
            )}
            {schedLimitPaused && !isSyncing && (
              <Badge
                className="bg-warning/10 text-warning gap-1.5 rounded-full font-semibold"
                title="Schedule paused — this month's plan record limit was reached. Upgrade your plan to resume."
              >
                <span className="bg-warning size-1.5 rounded-full" />
                Plan limit reached
              </Badge>
            )}
            {schedRetrying && !isSyncing && (
              <Badge
                className="bg-muted text-muted-foreground gap-1.5 rounded-full font-semibold"
                title="The last run was interrupted — it will automatically retry on the next scheduled tick."
              >
                <RefreshCw className="size-2.5" />
                Retry pending
              </Badge>
            )}
            {(activeRunLog?.status === 'running' || stopping) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStop}
                disabled={stopping}
                className="bg-warning/10 text-warning hover:bg-warning/20 h-6 rounded-full px-2.5 text-xs font-semibold"
                title={
                  stopping
                    ? 'Waiting for batch to finish cleanly…'
                    : 'Stop this sync run'
                }
              >
                {stopping ? (
                  <>
                    <RefreshCw className="animate-spin" /> Stopping…
                  </>
                ) : (
                  <>
                    <Square /> Stop
                  </>
                )}
              </Button>
            )}
            {runLogs[0]?.bullmqJobId &&
              runLogs[0]?.status === 'queued' &&
              !isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelQueue}
                  disabled={cancellingQueue}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 h-6 rounded-full px-2.5 text-xs font-semibold"
                >
                  <X /> {cancellingQueue ? 'Cancelling…' : 'Cancel Queue'}
                </Button>
              )}
            {runLogs[0]?.bullmqJobId &&
              job.status === 'error' &&
              !isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetryQueue}
                  disabled={retryingQueue}
                  className="bg-info/10 text-info hover:bg-info/20 h-6 rounded-full px-2.5 text-xs font-semibold"
                >
                  <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry Failed'}
                </Button>
              )}
          </div>
          <p className="text-muted-foreground text-sm">
            Sync job in{' '}
            <strong className="text-foreground font-semibold">
              {project?.name || '…'}
            </strong>
            {' · '}
            <span className="inline-flex items-center gap-1 font-mono">
              {job.sourceObject} <ArrowRight className="size-3" />{' '}
              {job.destObject}
            </span>
            {' · '}
            <span className="font-mono">{formatSchedule(job)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={() => setShowStartSync(true)}
            disabled={!isActive || isSyncing}
            title={
              !isActive
                ? 'Set status to Active first'
                : isSyncing
                  ? 'A sync is already in progress'
                  : 'Choose how to sync this job'
            }
          >
            <Play /> Start Sync
          </Button>
        </div>
      </div>

      {showStartSync && (
        <StartSyncModal
          projectId={projectId}
          jobId={job.id}
          job={job}
          hasBaseline={hasBaseline}
          scheduleToggling={scheduleToggling}
          pipelineRequired={pipelineRequired}
          pipelineConfigured={pipelineConfigured}
          onGoToPipeline={() => {
            setShowStartSync(false);
            handleTabChange('pipeline');
          }}
          onClose={() => setShowStartSync(false)}
          onLimitSyncDone={() => {
            beginTracking();
          }}
          onSyncAll={(range) => {
            setShowStartSync(false);
            handleSyncAll(() => handleTabChange('run-history'), range);
          }}
          onScheduleToggle={(payload) => {
            setShowStartSync(false);
            handleScheduleToggle(payload);
          }}
        />
      )}

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </>
  );
}
