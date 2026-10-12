import { ArrowRight, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import ProjectPlatformPair from './ProjectPlatformPair';

import {
  headingSubtitleStyles,
  headingTitleStyles,
} from '@/components/shared/headingStyles';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectSyncMode } from '@/types';

interface ProjectSummaryCardProps {
  name: string;
  description?: string | null;
  to?: string;
  footerAction?: ReactNode;
  sourcePlatformId: string | null;
  destPlatformId: string;
  syncMode?: ProjectSyncMode | null;
  status: string;
  statusBadge?: ReactNode;
  trailingBadge?: ReactNode;
  metrics: readonly [
    { label: string; value: ReactNode },
    { label: string; value: ReactNode },
  ];
  activityLabel: string;
}

/** Shared project card presentation for tenant and platform query adapters. */
export default function ProjectSummaryCard({
  name,
  description,
  to,
  footerAction,
  sourcePlatformId,
  destPlatformId,
  syncMode,
  status,
  statusBadge,
  trailingBadge,
  metrics,
  activityLabel,
}: ProjectSummaryCardProps) {
  return (
    <Card
      size="sm"
      className="hover:border-foreground/20 focus-within:border-foreground/20 h-full transition-all duration-200 ease-out focus-within:-translate-y-1 hover:-translate-y-1"
    >
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <ProjectPlatformPair
            sourcePlatformId={sourcePlatformId}
            destPlatformId={destPlatformId}
            syncMode={syncMode}
            size="2xl"
          />
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {statusBadge ?? <StatusBadge status={status} size="sm" />}
            {trailingBadge}
          </div>
        </div>

        <div className="space-y-1">
          {to ? (
            <Link
              to={to}
              className={cn(
                'hover:text-primary focus-visible:ring-ring block truncate rounded-sm transition-colors outline-none focus-visible:ring-2',
                headingTitleStyles.section,
              )}
            >
              {name}
            </Link>
          ) : (
            <div className={cn('truncate', headingTitleStyles.section)}>
              {name}
            </div>
          )}
          {description && (
            <p
              className={cn(
                'text-muted-foreground line-clamp-2',
                headingSubtitleStyles.card,
              )}
            >
              {description}
            </p>
          )}
        </div>

        <dl className="bg-secondary/40 border-border/60 mt-auto grid grid-cols-2 gap-3 rounded-2xl border p-3.5">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt className="text-muted-foreground text-xs font-medium">
                {metric.label}
              </dt>
              <dd className="text-foreground mt-1 text-lg font-bold tracking-tight tabular-nums">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{activityLabel}</span>
        </span>
        {footerAction ??
          (to ? (
            <Link
              to={to}
              className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
            >
              View project
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null)}
      </CardFooter>
    </Card>
  );
}
