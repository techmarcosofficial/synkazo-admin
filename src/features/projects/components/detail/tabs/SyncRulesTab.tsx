import { Clock, Lock, Plus, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useProjectDetailContext } from '../context';

import { projectsApi } from '@/api/projects';
import EmptyState from '@/components/shared/EmptyState';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { CreateJobDialog } from '@/features/jobs/components/create';
import { formatNum, formatSchedule } from '@/features/projects/utils';
import { useHeaderPrimaryAction } from '@/hooks/useHeaderPrimaryAction';
import { useEntitlements } from '@/queries/useEntitlements';
import type { ProjectStatus } from '@/types';

export default function SyncRulesTab() {
  const {
    project,
    jobs,
    hasBothConnections,
    showCreateJob,
    setShowCreateJob,
    patchProject,
    refetch,
  } = useProjectDetailContext();

  // Explain the sync-job allowance up front rather than after a 403 from the create call.
  const { canAddJob } = useEntitlements();
  const { prompt, dialog: upgradeDialog } = usePlanUpgradePrompt();
  const startCreateJob = () =>
    canAddJob
      ? setShowCreateJob(true)
      : prompt(
          "You've reached the number of sync jobs your plan allows. Upgrade to add more.",
        );

  useHeaderPrimaryAction({
    label: 'New Sync Job',
    icon: canAddJob ? Plus : Lock,
    onClick: startCreateJob,
  });

  const handleActivateProject = async () => {
    try {
      await projectsApi.updateProject(project.id, {
        status: 'active' as ProjectStatus,
      });
      patchProject({ status: 'active' as ProjectStatus });
      toast.success('Project activated!');
    } catch {
      toast.error('Could not activate project — check connections first.');
    }
  };

  return (
    <div className="space-y-6">
      {upgradeDialog}
      {showCreateJob && (
        <CreateJobDialog
          projectId={project.id}
          open={showCreateJob}
          onClose={() => setShowCreateJob(false)}
          onCreated={() => {
            setShowCreateJob(false);
            refetch();
            toast.success('Job created successfully', {
              description: 'Activate your project to start syncing data.',
              action:
                project.status !== 'active'
                  ? {
                      label: 'Activate project',
                      onClick: handleActivateProject,
                    }
                  : undefined,
            });
          }}
        />
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No sync jobs yet"
          description="Create your first sync job to start syncing data between platforms."
          action={{
            label: 'Create Sync Job',
            icon: canAddJob ? Plus : Lock,
            onClick: startCreateJob,
          }}
        />
      ) : (
        <>
          <Card className="overflow-hidden py-0">
            <div className="divide-y">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/projects/${project.id}/jobs/${job.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3.5 px-4.5 py-3.5 transition-colors"
                >
                  <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <ArrowLeftRight
                      className="text-muted-foreground shrink-0"
                      style={{ width: 15, height: 15 }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {job.name}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate font-mono text-[11.5px]">
                      {job.sourceObject}{' '}
                      <ArrowRight className="size-3 shrink-0" />{' '}
                      {job.destObject}
                    </div>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                    {job.syncDirection === 'two_way' ? 'Two-way' : 'One-way'}
                  </span>
                  <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap">
                    <Clock className="size-2.5" />
                    {formatSchedule(job)}
                  </div>
                  <div className="min-w-14 shrink-0 text-right">
                    <div className="text-sm font-bold">
                      {formatNum(job.recordsSynced)}
                    </div>
                    <div className="text-muted-foreground text-xs">records</div>
                  </div>
                  <StatusBadge
                    status={job.isEnabled ? 'active' : 'inactive'}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
