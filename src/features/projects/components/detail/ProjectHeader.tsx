import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectDetailContext } from './context';
import ProjectStatusDropdown from './ProjectStatusDropdown';

import { projectsApi } from '@/api/projects';
import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import HeaderPrimaryActionButton from '@/components/shared/HeaderPrimaryActionButton';
import StatusBadge from '@/components/shared/StatusBadge';
import type { ProjectStatus } from '@/types';

const PROJECT_STATUSES = ['draft', 'active', 'paused', 'error'];

export default function ProjectHeader() {
  const { project, connections, jobs, patchProject, projectActiveEnv } =
    useProjectDetailContext();

  const handleStatusSelect = async (status: string) => {
    if (status === 'active') {
      if (connections.filter((c) => c.status === 'connected').length === 0) {
        toast.error(
          'Cannot activate — no verified connections exist. Set up connections first.',
        );
        return;
      }
      if (jobs.length === 0) {
        toast.error(
          'Cannot activate — no jobs exist. Create at least one job first.',
        );
        return;
      }
    }
    try {
      await projectsApi.updateProject(project.id, {
        status: status as ProjectStatus,
      });
      patchProject({ status: status as ProjectStatus });
      toast.success(`Project status set to ${status}.`);
    } catch {
      toast.error('Could not update project status. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <PlatformIcon
            platformId={project.sourcePlatformId ?? ''}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
          {project.syncMode === 'two_way' ? (
            <ArrowLeftRight className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
          )}
          <PlatformIcon
            platformId={project.destPlatformId}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
        </div>
        <HeadingPair
          level="h1"
          title={<span className="block truncate">{project.name}</span>}
          trailing={
            <ProjectStatusDropdown
              current={project.status}
              options={PROJECT_STATUSES}
              onSelect={handleStatusSelect}
            />
          }
          subtitle={`${project.createdAt ? `Created ${format(new Date(project.createdAt), 'MMM d, yyyy')}` : ''}${project.lastSyncedAt ? ` · Last synced ${formatDistanceToNow(new Date(project.lastSyncedAt), { addSuffix: true })}` : ' · Not synced yet'}`}
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        {project.syncMode && (
          <StatusBadge status={project.syncMode} size="lg" />
        )}
        {projectActiveEnv && (
          <StatusBadge
            status={projectActiveEnv}
            label={
              projectActiveEnv === 'sandbox'
                ? 'Sandbox (Test Mode)'
                : 'Production (Live)'
            }
            title={
              projectActiveEnv === 'sandbox'
                ? 'Operating in Sandbox — Live customer data is not affected'
                : 'Live Production Sync active'
            }
            size="sm"
          />
        )}
        <HeaderPrimaryActionButton />
      </div>
    </div>
  );
}
