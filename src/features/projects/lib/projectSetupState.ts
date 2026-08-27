import type {
  ConnectionExt,
  JobExt,
  ProjectActivityLog,
  ProjectExt,
} from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import type { SyncRun } from '@/types';
export type ProjectSetupState =
  | 'Draft'
  | 'NeedsConnections'
  | 'CreatingSyncRule'
  | 'Live'
  | 'AttentionRequired';

export interface SetupStateInput {
  project: Pick<ProjectExt, 'setupCompletedAt'>;
  connections: ConnectionExt[];
  jobs: JobExt[];
}

// A source connected in one environment and a destination connected in another don't make a
// usable pair — nothing can actually sync between them. Both sides must be connected within
// the SAME environment (mirrors envFullyConnected in useProjectEnvironmentActivation.ts).
export function hasBothConnections(connections: ConnectionExt[]): boolean {
  const envs = ['production', 'sandbox'] as const;
  return envs.some((env) => {
    const envConns = connections.filter(
      (c) => (c.environment ?? 'production') === env,
    );
    return (
      envConns.some(
        (c) => c.status === 'connected' && c.connectionType === 'source',
      ) &&
      envConns.some(
        (c) => c.status === 'connected' && c.connectionType === 'destination',
      )
    );
  });
}

export function isSourceConnected(connections: ConnectionExt[]): boolean {
  return connections.some(
    (c) => c.status === 'connected' && c.connectionType === 'source',
  );
}

export function isDestConnected(connections: ConnectionExt[]): boolean {
  return connections.some(
    (c) => c.status === 'connected' && c.connectionType === 'destination',
  );
}

export function deriveProjectSetupState(
  input: SetupStateInput,
): ProjectSetupState {
  const { project, connections } = input;

  if (project.setupCompletedAt) return 'Live';
  if (connections.length === 0) return 'Draft';
  if (!hasBothConnections(connections)) return 'NeedsConnections';

  // Both platforms connected: the wizard's Create Sync Job step (which
  // covers job creation, status mapping, and field mapping internally via
  // CreateJobForm) is the right screen whether a job exists yet or not, and
  // it stays the right screen until the wizard explicitly calls
  // projectsApi.completeSetup() once the job is fully created.
  return 'CreatingSyncRule';
}

export type ProjectHealthLevel = 'healthy' | 'degraded' | 'unhealthy';

export interface ProjectHealthIssue {
  message: string;
  tab: ProjectDetailTabId;
  severity: 'warning' | 'danger';
}

// Health check for the Overview dashboard in Management Mode — a separate,
// display-only concern from the mode-switch above. A Live project can still
// need attention (disconnected platform, no enabled jobs, recent errors)
// without ever being routed back into the wizard. Single source of truth for
// both the health summary badge and the Attention Required list, so the two
// can never disagree.
export function deriveProjectHealth(input: {
  connections: ConnectionExt[];
  jobs: JobExt[];
  totalErrors: number;
  logs: ProjectActivityLog[];
}): { level: ProjectHealthLevel; issues: ProjectHealthIssue[] } {
  const { connections, jobs, totalErrors, logs } = input;
  const issues: ProjectHealthIssue[] = [];

  if (!hasBothConnections(connections)) {
    issues.push({
      message:
        'A platform connection is disconnected — reconnect in the Connections tab.',
      tab: 'connections',
      severity: 'danger',
    });
  }

  if (jobs.length === 0) {
    issues.push({
      message: 'No sync jobs configured.',
      tab: 'sync-rules',
      severity: 'warning',
    });
  } else if (!jobs.some((j) => j.isEnabled)) {
    issues.push({
      message: 'All sync jobs are paused.',
      tab: 'sync-rules',
      severity: 'warning',
    });
  }

  if (totalErrors > 0) {
    issues.push({
      message: `${totalErrors} sync error${totalErrors > 1 ? 's' : ''} in recent activity — check the Activity tab.`,
      tab: 'activity',
      severity: 'danger',
    });
  }

  const recentFailures = logs
    .slice(0, 10)
    .filter((l) => l.metadata?.status === 'failed').length;
  if (recentFailures >= 3) {
    issues.push({
      message: 'Repeated failures in recent activity — check the Activity tab.',
      tab: 'activity',
      severity: 'warning',
    });
  }

  const level: ProjectHealthLevel = issues.some((i) => i.severity === 'danger')
    ? 'unhealthy'
    : issues.length > 0
      ? 'degraded'
      : 'healthy';

  return { level, issues };
}

export function hasSuccessfulTestRun(runLog: SyncRun | null): boolean {
  if (!runLog) {
    return false;
  }

  // Failed run
  if (runLog.status === 'failed') {
    return false;
  }

  // Still running
  if (runLog.status === 'running') {
    return false;
  }

  // Completed successfully
  if (runLog.status === 'completed' && (runLog.failedCount ?? 0) === 0) {
    return true;
  }

  return false;
}
