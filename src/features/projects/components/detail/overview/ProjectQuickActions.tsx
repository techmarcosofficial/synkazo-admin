import { CalendarClock, ListChecks, Plug, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import type { ConnectionExt, JobExt } from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import { showToast } from '@/lib/toast';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

interface ProjectQuickActionsProps {
  projectId: string;
  connections: ConnectionExt[];
  jobs: JobExt[];
  onCreateSyncRule: () => void;
  setConnectionsCache: (conns: ConnectionExt[]) => void;
  refetch: () => void;
  handleTabChange: (tab: ProjectDetailTabId) => void;
}

export default function ProjectQuickActions({
  projectId,
  connections,
  jobs,
  onCreateSyncRule,
  setConnectionsCache,
  refetch,
  handleTabChange,
}: ProjectQuickActionsProps) {
  const [testingConnections, setTestingConnections] = useState(false);
  const confirm = useConfirmDialogStore((s) => s.confirm);
  const pausedJobs = jobs.filter((j) => !j.isEnabled);

  async function handleTestConnections() {
    if (connections.length === 0) return;
    setTestingConnections(true);
    try {
      const results = await Promise.all(
        connections.map(async (conn) => {
          try {
            const result = await connectionsApi.testConnection(
              projectId,
              conn.id,
            );
            return { conn, success: result.success };
          } catch {
            return { conn, success: false };
          }
        }),
      );
      const failed = results.filter((r) => !r.success);
      setConnectionsCache(
        connections.map((conn) => {
          const result = results.find((r) => r.conn.id === conn.id);
          return result
            ? { ...conn, status: result.success ? 'connected' : 'disconnected' }
            : conn;
        }),
      );
      if (failed.length === 0) {
        showToast.success(`${results.length} connection(s) verified`);
      } else {
        showToast.error(
          `${failed.length} of ${results.length} connection(s) failed`,
        );
      }
      refetch();
    } finally {
      setTestingConnections(false);
    }
  }

  function handleResumePaused() {
    confirm({
      variant: 'warning',
      title: 'Resume paused sync jobs?',
      description: `This will re-enable ${pausedJobs.length} paused sync job(s).`,
      confirmLabel: 'Resume',
      onConfirm: async () => {
        await Promise.all(
          pausedJobs.map((job) =>
            jobsApi.setSyncEnabled(projectId, job.id, true),
          ),
        );
        showToast.success('Sync jobs resumed');
        refetch();
      },
    });
  }

  return (
    <div className="flex justify-between">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Activity & Action</h3>
        <p className="text-muted-foreground text-xs">
          Recent activity & take any quick action
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onCreateSyncRule}>
          <Plus /> Add Sync Job
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={connections.length === 0 || testingConnections}
          onClick={handleTestConnections}
        >
          <Plug /> Test All Connections
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTabChange('activity')}
        >
          <ListChecks /> View Activity
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTabChange('scheduler')}
        >
          <CalendarClock /> Go to Scheduler
        </Button>
        {pausedJobs.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleResumePaused}>
            <RotateCcw /> Resume Paused Sync Jobs
          </Button>
        )}
      </div>
    </div>
  );
}
