import { ArrowRight } from 'lucide-react';

import { ConnectionBoard } from '../connections';
import { useProjectDetailContext } from '../context';
import { PageContextAlert } from '../shared';

import { Button } from '@/components/ui/button';
import type { ConnectionExt } from '@/features/projects/hooks';

export default function ConnectionsTab() {
  const {
    projectId,
    project,
    hasBothConnections,
    hasJobs,
    setConnectionsCache,
    projectActiveEnv,
    connReloadKey,
    onCreateSyncRule,
  } = useProjectDetailContext();

  return (
    <div className="space-y-6">
      <ConnectionBoard
        projectId={projectId}
        sourcePlatformId={project.sourcePlatformId ?? undefined}
        destPlatformId={project.destPlatformId}
        syncMode={project.syncMode ?? null}
        onConnectionsChange={(conns) =>
          setConnectionsCache(conns as ConnectionExt[])
        }
        projectActiveEnv={projectActiveEnv}
        reloadKey={connReloadKey}
      />

      {hasBothConnections && !hasJobs && (
        <PageContextAlert
          variant="info"
          title="Connections ready"
          description="Both platforms connected — create your first job to continue"
          actions={
            <Button onClick={onCreateSyncRule}>
              Next step: Create Sync Job <ArrowRight />
            </Button>
          }
        />
      )}
    </div>
  );
}
