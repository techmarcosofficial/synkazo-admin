import { ArrowRight, Sparkles } from 'lucide-react';

import { ConnectionBoard } from '../connections';
import { useProjectDetailContext } from '../context';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DraftResumptionBanner } from '@/features/journey';
import type { ConnectionExt } from '@/features/projects/hooks';

export default function ConnectionsTab() {
  const {
    projectId,
    project,
    hasBothConnections,
    hasJobs,
    onCreateSyncRule,
    setConnectionsCache,
    projectActiveEnv,
    connReloadKey,
  } = useProjectDetailContext();

  return (
    <div className="space-y-6" data-project-connections-tab>
      <DraftResumptionBanner
        projectId={projectId}
        onResume={onCreateSyncRule}
      />
      {hasBothConnections && !hasJobs && (
        <Card className="border-primary/20 bg-primary/5 rounded-3xl p-4 shadow-xs sm:p-5">
          <CardContent className="flex flex-col gap-3 p-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold tracking-tight">
                  Both platforms are connected and verified!
                </h4>
                <p className="text-muted-foreground text-xs">
                  You are ready to create your first sync flow between your
                  software.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onCreateSyncRule}
              className="gap-1.5 text-xs font-semibold"
            >
              <span>Choose What to Sync</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
