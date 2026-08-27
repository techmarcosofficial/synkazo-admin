import { Check } from 'lucide-react';

import { ConnectionBoard } from '@/features/projects/components/detail/connections';
import type { ConnectionExt, ProjectExt } from '@/features/projects/hooks';
import { hasBothConnections } from '@/features/projects/lib/projectSetupState';

interface StepConnectPlatformsProps {
  projectId: string;
  project: ProjectExt;
  connections: ConnectionExt[];
  onConnectionsChange: (conns: ConnectionExt[]) => void;
}

export default function StepConnectPlatforms({
  projectId,
  project,
  connections,
  onConnectionsChange,
}: StepConnectPlatformsProps) {
  const bothConnected = hasBothConnections(connections);

  return (
    <div className="mx-auto space-y-4">
      {/* Environment toggle intentionally visible — users can set up against
          production directly instead of being forced through sandbox. */}
      <ConnectionBoard
        projectId={projectId}
        sourcePlatformId={project.sourcePlatformId ?? undefined}
        destPlatformId={project.destPlatformId}
        syncMode={project.syncMode ?? null}
        onConnectionsChange={(conns) =>
          onConnectionsChange(conns as ConnectionExt[])
        }
        className="p-6"
      />

      <div className="flex items-center gap-2 rounded-xl border px-5 py-4 text-sm">
        {bothConnected ? (
          <>
            <Check className="text-success size-4" />
            <span className="text-foreground font-medium">
              Both platforms connected
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Connect both a source and destination platform to continue.
          </span>
        )}
      </div>
    </div>
  );
}
