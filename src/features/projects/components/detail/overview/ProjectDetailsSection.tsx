import { format, formatDistanceToNow } from 'date-fns';

import { PlatformPair } from '@/components/platform';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import type { ProjectExt } from '@/features/projects/hooks';

interface ProjectDetailsSectionProps {
  project: ProjectExt;
}

export default function ProjectDetailsSection({
  project,
}: ProjectDetailsSectionProps) {
  return (
    <div className="bg-card overflow-hidden rounded-4xl border">
      <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
        <h3 className="text-md font-semibold">Project Details</h3>
      </div>

      <ListRow className="justify-between">
        <span className="text-muted-foreground">Platform Pair</span>
        <PlatformPair
          variant="text"
          sourcePlatformId={project.sourcePlatformId ?? ''}
          destPlatformId={project.destPlatformId}
        />
      </ListRow>

      <ListRow className="justify-between">
        <span className="text-muted-foreground">Status</span>
        <StatusBadge status={project.status} size="sm" />
      </ListRow>

      {project.createdAt && (
        <ListRow className="justify-between">
          <span className="text-muted-foreground">Created</span>
          <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
        </ListRow>
      )}

      {project.lastSyncedAt && (
        <ListRow className="justify-between">
          <span className="text-muted-foreground">Last Synced</span>
          <span>
            {formatDistanceToNow(new Date(project.lastSyncedAt), {
              addSuffix: true,
            })}
          </span>
        </ListRow>
      )}

      {project.description && (
        <ListRow className="items-start justify-between">
          <span className="text-muted-foreground">Description</span>
          <span className="max-w-xs text-right">{project.description}</span>
        </ListRow>
      )}
    </div>
  );
}
