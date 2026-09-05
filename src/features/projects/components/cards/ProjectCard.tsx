import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import ProjectPlatformPair from './ProjectPlatformPair';

import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { ProjectExtended } from '@/features/projects/types';

interface ProjectCardProps {
  project: ProjectExtended;
  jobCount: number;
  organisationName?: string;
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

export default function ProjectCard({
  project,
  jobCount,
  organisationName,
}: ProjectCardProps) {
  const activityLabel = project.lastSyncedAt
    ? `Synced ${relativeTime(project.lastSyncedAt)}`
    : project.updatedAt
      ? `Updated ${relativeTime(project.updatedAt)}`
      : 'Not synced yet';
  return (
    <Card
      size="sm"
      className="hover:shadow-primary/5 h-full transition-all duration-200 ease-out focus-within:-translate-y-1 focus-within:shadow-md hover:-translate-y-1 hover:shadow-md"
    >
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <ProjectPlatformPair
            sourcePlatformId={project.sourcePlatformId}
            destPlatformId={project.destPlatformId}
            syncMode={project.syncMode}
            size="2xl"
          />
          <StatusBadge status={project.status} size="sm" />
        </div>

        <div className="space-y-1">
          <Link
            to={`/projects/${project.id}`}
            className="hover:text-primary focus-visible:ring-ring block truncate rounded-sm text-base font-semibold transition-colors outline-none focus-visible:ring-2"
          >
            {project.name}
          </Link>
          {project.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {project.description}
            </p>
          )}
          {organisationName && (
            <Badge variant="secondary" className="mt-1">
              {organisationName}
            </Badge>
          )}
        </div>
        <dl className="bg-muted/50 mt-auto grid grid-cols-2 gap-3 rounded-3xl p-3">
          <div>
            <dt className="text-muted-foreground text-xs">Records synced</dt>
            <dd className="mt-1 text-lg font-semibold">
              {formatCompact(project.totalRecordsSynced ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Sync jobs</dt>
            <dd className="mt-1 text-lg font-semibold">{jobCount}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{activityLabel}</span>
        </span>
        <Link
          to={`/projects/${project.id}`}
          className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
        >
          View project
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
