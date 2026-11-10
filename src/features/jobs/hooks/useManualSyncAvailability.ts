import { useJobDetailContext } from '@/features/jobs/components/detail/context';
import { selectJobOnboardingState } from '@/features/onboarding';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

// Whether a manual sync can start right now, and why not. Shared by the
// Overview's "Sync now" button and the Run Sync tab so they never disagree.
export function useManualSyncAvailability() {
  const {
    job,
    project,
    hasConnection,
    jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    isSyncing,
  } = useJobDetailContext();
  const { hasPermission } = useSynkazoAuth();
  const canRunJob = hasPermission('job.run');

  const queued = runLogs[0]?.status === 'queued';
  const canActivate =
    project?.status === 'active' &&
    hasConnection &&
    jobFieldMappings.length > 0 &&
    jobFieldMappings.some((mapping) => mapping.matchDestKey);
  const onboarding = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const hasRunHistory = onboarding.testComplete;
  const canStartSync =
    canActivate &&
    onboarding.configurationReady &&
    (job.isEnabled || !hasRunHistory);
  const syncBlocked = queued || isSyncing || !canStartSync;
  const hasBaseline = Boolean(
    job.lastSyncedAt ||
    runLogs.some((r) => r.status === 'completed' || r.status === 'success'),
  );

  let blockedReason: string | null = null;
  if (!canRunJob) {
    blockedReason =
      "You don't have permission to run this sync flow. Contact your administrator.";
  } else if (isSyncing) {
    blockedReason =
      'A sync is running. Follow its progress on Overview; you can start another run once it finishes.';
  } else if (queued) {
    blockedReason =
      'A run is queued. Cancel it on Overview before starting a different run.';
  } else if (project?.status !== 'active') {
    blockedReason = 'The project is not active. Activate it to run syncs.';
  } else if (!hasConnection) {
    blockedReason = 'Connect both platforms on the project before syncing.';
  } else if (!onboarding.mappingReady) {
    blockedReason =
      'Map your fields and choose at least one Match Field on Field Mapping first.';
  } else if (!onboarding.configurationReady) {
    blockedReason = 'Choose the destination pipeline on Pipeline first.';
  } else if (!canStartSync) {
    blockedReason =
      'This flow is inactive. Activate it from the Status dropdown in the header to run it again.';
  }

  return {
    canRunJob,
    queued,
    canActivate,
    onboarding,
    hasRunHistory,
    canStartSync,
    syncBlocked,
    hasBaseline,
    blockedReason,
  };
}
