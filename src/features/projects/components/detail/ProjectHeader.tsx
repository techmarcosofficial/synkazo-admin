import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectDetailContext } from './context';
import EnvironmentToggle from './EnvironmentToggle';
import ProjectStatusDropdown from './ProjectStatusDropdown';

import { projectsApi } from '@/api/projects';
import { PlatformIcon } from '@/components/platform';
import HeaderPrimaryActionButton from '@/components/shared/HeaderPrimaryActionButton';
import { BackLink } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@/types';

const PROJECT_STATUSES = ['draft', 'active', 'paused', 'error'];

export default function ProjectHeader() {
  const {
    project,
    connections,
    jobs,
    patchProject,
    projectActiveEnv,
    envActivating,
    envDiffLoading,
    envFullyConnected,
    envHasAnyConnected,
    onActivateEnv,
  } = useProjectDetailContext();

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
    <>
      <BackLink
        label="Back to Projects"
        to="/projects"
        className="pt-3.5 pb-2"
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <PlatformIcon
              platformId={project.sourcePlatformId ?? ''}
              variant="avatar"
              size="3xl"
            />
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            <PlatformIcon
              platformId={project.destPlatformId}
              variant="avatar"
              size="3xl"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <ProjectStatusDropdown
                current={project.status}
                options={PROJECT_STATUSES}
                onSelect={handleStatusSelect}
              />
            </div>
            <div className="text-muted-foreground mt-1 font-mono text-xs leading-5">
              {project.createdAt
                ? `Created ${format(new Date(project.createdAt), 'MMM d, yyyy')}`
                : ''}
              {project.lastSyncedAt
                ? ` · Last synced ${formatDistanceToNow(new Date(project.lastSyncedAt), { addSuffix: true })}`
                : ' · not synced yet'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {project.syncMode && (
            <Badge variant="secondary" className="gap-1.5">
              {project.syncMode === 'two_way' ? (
                <ArrowLeftRight className="size-3" />
              ) : (
                <ArrowRight className="size-3" />
              )}
              {project.syncMode === 'two_way' ? 'Two Way' : 'One Way'}
            </Badge>
          )}
          <EnvironmentToggle
            projectActiveEnv={projectActiveEnv}
            envActivating={envActivating}
            envDiffLoading={envDiffLoading}
            envFullyConnected={envFullyConnected}
            envHasAnyConnected={envHasAnyConnected}
            onActivate={onActivateEnv}
          />
          <HeaderPrimaryActionButton />
        </div>
      </div>
    </>
  );
}
