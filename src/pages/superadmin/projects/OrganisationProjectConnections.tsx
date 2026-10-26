import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  createSuperAdminConnectionAccess,
  superAdminConnectionsApi,
} from '@/api/superAdminConnections';
import { ConnectionAccessProvider } from '@/components/connections/ConnectionAccessContext';
import type { ExtConnection } from '@/components/connections/types';
import ConnectionBoard from '@/features/projects/components/detail/connections/ConnectionBoard';
import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';
import type {
  SuperAdminJobListItem,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';

export default function OrganisationProjectConnections({
  organisationId,
  organisationName,
  project,
  jobs,
  onContinue,
}: {
  organisationId: string;
  organisationName: string;
  project: SuperAdminProjectDetail;
  jobs?: SuperAdminJobListItem[];
  onContinue: () => void;
}) {
  const queryClient = useQueryClient();
  const [disconnect, setDisconnect] = useState<{
    conn: ExtConnection;
    onRemoved: () => void;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', 'organisations'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', 'platform', 'overview'],
      }),
    ]);
  }, [queryClient, organisationId]);
  const access = useMemo(
    () => ({
      api: createSuperAdminConnectionAccess(
        organisationId,
        project.id,
        changed,
      ),
      audience: 'super_admin' as const,
      onDisconnect: (conn: ExtConnection, onRemoved: () => void) => {
        setError(null);
        setDisconnect({ conn, onRemoved });
      },
    }),
    [organisationId, project.id, changed],
  );
  const submitDisconnect = async (reason: string) => {
    if (!disconnect || pending) return;
    setPending(true);
    try {
      await superAdminConnectionsApi.disconnect(
        organisationId,
        project.id,
        disconnect.conn.id,
        { reason, confirmation: project.name },
      );
      disconnect.onRemoved();
      setDisconnect(null);
      await changed();
    } catch (err) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(
        response.response?.data?.message ??
          'Could not disconnect this connection. Try again.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <ConnectionAccessProvider value={access}>
      <ConnectionBoard
        key={`${organisationId}:${project.id}`}
        projectId={project.id}
        sourcePlatformId={project.sourcePlatformId}
        destPlatformId={project.destPlatformId}
        syncMode={project.syncMode === 'two_way' ? 'two_way' : 'one_way'}
        projectActiveEnv={
          project.environmentActivatedAt ? project.activeEnvironment : null
        }
        onSaved={() => {
          void changed();
        }}
        onContinue={onContinue}
      />
      <LifecycleConfirmDialog
        open={!!disconnect}
        onOpenChange={(open) => {
          if (!open && !pending) setDisconnect(null);
        }}
        title="Disconnect platform connection?"
        description={`${organisationName} · ${project.name} · ${disconnect?.conn.environment ?? ''}. Stored credentials will be removed.`}
        bodyWarning={
          jobs
            ? `${jobs.filter((job) => job.isEnabled).length} enabled sync flows; ${jobs.filter((job) => job.isRunning).length} currently running.`
            : undefined
        }
        actionLabel="Disconnect"
        tone="danger"
        organisationName={project.name}
        requiresNameConfirm
        caseSensitiveNameConfirm
        minReasonLength={10}
        isSubmitting={pending}
        errorMessage={error}
        onSubmit={({ reason }) => void submitDisconnect(reason)}
      />
    </ConnectionAccessProvider>
  );
}
