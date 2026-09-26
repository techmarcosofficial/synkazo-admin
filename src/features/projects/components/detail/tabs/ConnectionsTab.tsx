import { ConnectionBoard } from '../connections';
import { useProjectDetailContext } from '../context';

import type { ConnectionExt } from '@/features/projects/hooks';

export default function ConnectionsTab() {
  const {
    projectId,
    project,
    setConnectionsCache,
    projectActiveEnv,
    connReloadKey,
    refetch,
  } = useProjectDetailContext();

  return (
    <div className="space-y-6" data-project-connections-tab>
      <ConnectionBoard
        projectId={projectId}
        sourcePlatformId={project.sourcePlatformId ?? undefined}
        destPlatformId={project.destPlatformId}
        syncMode={project.syncMode ?? null}
        onConnectionsChange={(conns) =>
          setConnectionsCache(conns as ConnectionExt[])
        }
        onSaved={refetch}
        projectActiveEnv={projectActiveEnv}
        reloadKey={connReloadKey}
      />
    </div>
  );
}
