import { ArrowRight, FolderOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';

function formatNum(n: number | undefined | null) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export interface ProjectsOverviewCardProps {
  projects: Project[];
}

export default function ProjectsOverviewCard({
  projects,
}: ProjectsOverviewCardProps) {
  return (
    <div className="bg-card overflow-hidden rounded-4xl border">
      <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
        <h3 className="text-md font-semibold">Your projects</h3>
        <Button asChild variant="link" size="sm">
          <Link to="/projects">
            View all <ArrowRight />
          </Link>
        </Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Connect your platforms and start syncing data in minutes."
          action={
            <Button asChild>
              <Link to="/projects?new=1">
                <Plus /> Create your first project
              </Link>
            </Button>
          }
        />
      ) : (
        <div>
          {projects.slice(0, 6).map((project) => (
            <ListRow key={project.id} asChild className="justify-between py-3">
              <Link to={`/projects/${project.id}`}>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <PlatformPair
                      sourcePlatformId={project.sourcePlatformId ?? ''}
                      destPlatformId={project.destPlatformId}
                      size="xl"
                      variant="avatar"
                    />
                    <div>
                      <span className="truncate font-semibold">
                        {project.name}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <div className="text-muted-foreground text-xs">
                          {formatNum(project.totalRecordsSynced)}
                        </div>

                        <div className="text-muted-foreground text-xs">
                          records
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <StatusBadge status={project.status} size="sm" />
              </Link>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
