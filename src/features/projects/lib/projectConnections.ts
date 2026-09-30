import type { ConnectionExt } from '@/features/projects/hooks';

// A source connected in one environment and a destination connected in another
// do not make a usable pair. Both sides must be connected in the same environment.
export function hasBothConnections(connections: ConnectionExt[]): boolean {
  const environments = ['production', 'sandbox'] as const;

  return environments.some((environment) => {
    const environmentConnections = connections.filter(
      (connection) => (connection.environment ?? 'production') === environment,
    );

    return (
      environmentConnections.some(
        (connection) =>
          connection.status === 'connected' &&
          connection.connectionType === 'source',
      ) &&
      environmentConnections.some(
        (connection) =>
          connection.status === 'connected' &&
          connection.connectionType === 'destination',
      )
    );
  });
}

export function isEnvironmentFullyConnected(
  connections: Array<{
    status?: string;
    connectionType?: string;
    environment?: string;
  }>,
  env: 'production' | 'sandbox' = 'production',
): boolean {
  const envConns = connections.filter(
    (c) => (c.environment ?? 'production') === env && c.status === 'connected',
  );
  return (
    envConns.some((c) => c.connectionType === 'source') &&
    envConns.some((c) => c.connectionType === 'destination')
  );
}

