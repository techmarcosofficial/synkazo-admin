import { RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ConnectionBoard } from '@/features/projects/components/detail/connections';
import type { ProjectExtended } from '@/features/projects/types';
import { useProjectQuery } from '@/queries/useProjects';

export default function ProjectConnections() {
  const { id: projectId } = useParams<{ id: string }>();
  const projectQuery = useProjectQuery(projectId!);
  const [refreshKey, setRefreshKey] = useState(0);
  const project = projectQuery.data as ProjectExtended | undefined;
  // A fresh project defaults to "production" in the DB before any setup happens —
  // environmentActivatedAt is the authoritative "has this actually been activated" flag.
  const projectActiveEnv = project?.environmentActivatedAt
    ? (project.activeEnvironment ?? null)
    : null;

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Project', to: `/projects/${projectId}` }}
        title="Connections"
        description="Manage platform credentials for this project"
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            title="Refresh"
          >
            <RefreshCw />
          </Button>
        }
      />

      <ConnectionBoard
        key={refreshKey}
        projectId={projectId!}
        sourcePlatformId={projectQuery.data?.sourcePlatformId ?? undefined}
        destPlatformId={projectQuery.data?.destPlatformId}
        syncMode={projectQuery.data?.syncMode ?? null}
        projectActiveEnv={projectActiveEnv}
      />
    </div>
  );
}
