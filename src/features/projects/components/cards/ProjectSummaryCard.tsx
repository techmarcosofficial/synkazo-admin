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
      className="hover:border-foreground/20 focus-within:border-foreground/20 relative h-full transition-all duration-200 ease-out focus-within:-translate-y-1 hover:-translate-y-1"
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
                // Stretched link: its ::after covers the whole card so any click opens the project.
                'group-hover/card:text-primary focus-visible:after:ring-ring block truncate rounded-sm transition-colors outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[""] focus-visible:after:ring-2',
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

        <dl className="divide-border/60 mt-auto grid grid-cols-2 divide-x">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1.5 px-4 first:pl-0">
              <dt className="text-muted-foreground text-[11px] leading-4 font-semibold tracking-wider uppercase">
                {metric.label}
              </dt>
              <dd className="text-foreground text-2xl leading-7 font-semibold tracking-tight tabular-nums">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>

      <CardFooter className="border-border/60 justify-between gap-3 border-t">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{activityLabel}</span>
        </span>
        {footerAction ? (
          <div className="relative z-10">{footerAction}</div>
        ) : to ? (
          <span
            aria-hidden="true"
            className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium group-hover/card:underline"
          >
            View project
            <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" />
          </span>
        ) : null}
      </CardFooter>
    </Card>
  );
}
