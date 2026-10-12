import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

import ProjectSummaryCard from './ProjectSummaryCard';

import StatusBadge from '@/components/shared/StatusBadge';
import type { ProjectExtended } from '@/features/projects/types';

interface ProjectCardProps {
  project: ProjectExtended;
  jobCount: number;
}

function relativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true }).replace(
    'about ',
    '',
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value);
}

export default function ProjectCard({ project, jobCount }: ProjectCardProps) {
  const activityLabel = project.lastSyncedAt
    ? `Synced ${relativeTime(project.lastSyncedAt)}`
    : project.updatedAt
      ? `Updated ${relativeTime(project.updatedAt)}`
      : 'Not synced yet';
  const activeEnv = project.activeEnvironment ?? project.active_environment;
  const isSandbox = activeEnv === 'sandbox';

  return (
    <ProjectSummaryCard
      name={project.name}
      description={project.description}
      to={`/projects/${project.id}`}
      sourcePlatformId={project.sourcePlatformId}
      destPlatformId={project.destPlatformId}
      syncMode={project.syncMode}
      status={project.status}
      activityLabel={activityLabel}
      metrics={[
        {
          label: 'Records synced',
          value: formatCompact(project.totalRecordsSynced ?? 0),
        },
        { label: 'Sync jobs', value: jobCount },
      ]}
      trailingBadge={
        activeEnv ? (
          <Link
            to={`/projects/${project.id}?tab=settings&section=environments`}
            className="focus-visible:ring-ring inline-flex rounded-full transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:outline-none"
            title={
              isSandbox
                ? 'Operating in Sandbox (Test Mode) — Click to open Environment Settings'
                : 'Operating in Production (Live) — Click to open Environment Settings'
            }
          >
            <StatusBadge
              status={activeEnv}
              label={isSandbox ? 'Sandbox' : 'Production'}
              size="sm"
            />
          </Link>
        ) : undefined
      }
    />
  );
}
