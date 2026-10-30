import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import ProjectIdentityHeader from './ProjectIdentityHeader';
import { useProjectDetailContext } from './context';
import ProjectStatusDropdown from './ProjectStatusDropdown';

import { projectsApi } from '@/api/projects';
import HeaderPrimaryActionButton from '@/components/shared/HeaderPrimaryActionButton';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { ProjectStatus } from '@/types';

const PROJECT_STATUSES = ['draft', 'active', 'paused', 'error'];

export default function ProjectHeader() {
  const { project, connections, jobs, patchProject, projectActiveEnv } =
    useProjectDetailContext();
  const { hasPermission } = useSynkazoAuth();
  const canViewJobs = hasPermission('job.view');

  const handleStatusSelect = async (status: string) => {
    if (status === 'active') {
      if (connections.filter((c) => c.status === 'connected').length === 0) {
        toast.error(
          'Cannot activate — no verified connections exist. Set up connections first.',
        );
        return;
      }
      if (canViewJobs && jobs.length === 0) {
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
    <ProjectIdentityHeader
      name={project.name}
      sourcePlatformId={project.sourcePlatformId}
      destPlatformId={project.destPlatformId}
      syncMode={project.syncMode}
      activeEnvironment={projectActiveEnv}
      subtitle={`${project.createdAt ? `Created ${format(new Date(project.createdAt), 'MMM d, yyyy')}` : ''}${project.lastSyncedAt ? ` · Last synced ${formatDistanceToNow(new Date(project.lastSyncedAt), { addSuffix: true })}` : ' · Not synced yet'}`}
      statusControl={
        <ProjectStatusDropdown
          current={project.status}
          options={PROJECT_STATUSES}
          onSelect={handleStatusSelect}
          disabled={!hasPermission('project.edit')}
        />
      }
      action={<HeaderPrimaryActionButton />}
    />
  );
}
