import type { ConnectionExt, ProjectExt } from '@/features/projects/hooks';
import type { SyncRun } from '@/types';
export type ProjectSetupState =
  'Draft' | 'NeedsConnections' | 'CreatingSyncRule' | 'Live';

export interface SetupStateInput {
  project: Pick<ProjectExt, 'setupCompletedAt'>;
  connections: ConnectionExt[];
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
