import { Building2, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { PlatformIcon } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectExt } from '@/features/projects/hooks';
import { cn } from '@/lib/utils';
import { useOrgQuery } from '@/queries/useOrganisations';
import type { ProjectEnvironment } from '@/types';

function ContextLabel({ children }: { children: ReactNode }) {
  return (
    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </dt>
  );
}

export default function ProjectContextCard({
  project,
  activeEnvironment,
  environmentsHref,
  className,
}: {
  project: ProjectExt;
  activeEnvironment: ProjectEnvironment | null;
  environmentsHref: string;
  className?: string;
}) {
  const organisationQuery = useOrgQuery(project.organisationId);

  return (
    <Card className={cn('gap-0 border py-0', className)}>
      <CardHeader className="gap-0 px-4 py-3">
        <CardTitle className="text-sm font-semibold">Project context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <ContextLabel>Organization</ContextLabel>
            <dd>
              {organisationQuery.isLoading ? (
                <Skeleton
                  className="h-5 w-36"
                  aria-label="Loading organization"
                />
              ) : organisationQuery.isError || !organisationQuery.data ? (
                <div>
                  <p className="text-destructive text-sm font-medium">
                    Organization name unavailable
                  </p>
                  <p className="text-muted-foreground text-xs break-all">
                    ID: {project.organisationId}
                  </p>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <Building2
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">
                    {organisationQuery.data.name}
                  </span>
                </div>
              )}
            </dd>
          </div>

          <div className="min-w-0 space-y-1">
            <ContextLabel>Sync direction</ContextLabel>
            <dd>
              <StatusBadge
                status={project.syncMode ?? 'unrestricted'}
                size="sm"
              />
            </dd>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <ContextLabel>Active environment</ContextLabel>
            <dd className="flex flex-wrap items-center justify-between gap-2">
              {activeEnvironment ? (
                <StatusBadge status={activeEnvironment} size="sm" />
              ) : (
                <span className="text-muted-foreground text-sm">
                  Not activated
                </span>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to={environmentsHref}>
                  View environments
                  <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Integration platforms</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="bg-muted/50 min-w-0 space-y-1.5 rounded-2xl p-2.5">
              <p className="text-muted-foreground text-xs">Source</p>
              {project.sourcePlatformId ? (
                <div className="flex flex-col items-start gap-2">
                  <PlatformIcon
                    platformId={project.sourcePlatformId}
                    variant="avatar"
                    size="lg"
                  />
                  <PlatformIcon
                    platformId={project.sourcePlatformId}
                    variant="text"
                    size="md"
                    className="text-sm font-medium"
                  />
                </div>
              ) : (
                <p className="text-sm font-medium">Not selected yet</p>
              )}
            </div>
            <div className="bg-muted/50 min-w-0 space-y-1.5 rounded-2xl p-2.5">
              <p className="text-muted-foreground text-xs">Destination</p>
              <div className="flex flex-col items-start gap-2">
                <PlatformIcon
                  platformId={project.destPlatformId}
                  variant="avatar"
                  size="lg"
                />
                <PlatformIcon
                  platformId={project.destPlatformId}
                  variant="text"
                  size="md"
                  className="text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
