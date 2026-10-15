import {
  Database,
  FolderOpen,
  Package,
  Users,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OverLimitSummary, UsageSummary } from '@/types/billing';

export interface ResourceItemData {
  key: string;
  label: string;
  icon: React.ElementType;
  count: number;
  limit: number | null;
  over?: boolean;
  colorGradient: string;
  trackBg?: string;
}

interface EntitlementsUsageProps {
  organisationId: string;
  planName: string;
  overLimit?: OverLimitSummary | null;
  usage?: UsageSummary | null;
  onViewUsageDetails?: () => void;
  className?: string;
}

export default function EntitlementsUsage({
  organisationId,
  planName,
  overLimit,
  usage,
  onViewUsageDetails,
  className,
}: EntitlementsUsageProps) {
  const projectsLimit = overLimit?.projects.limit ?? null;
  const projectsCount = overLimit?.projects.count ?? 0;
  const projectsOver = overLimit?.projects.over ?? false;

  const jobsLimit = overLimit?.jobs.limit ?? null;
  const jobsCount = overLimit?.jobs.count ?? 0;
  const jobsOver = overLimit?.jobs.over ?? false;

  const membersLimit = overLimit?.teamMembers.limit ?? null;
  const membersCount = overLimit?.teamMembers.count ?? 0;
  const membersOver = overLimit?.teamMembers.over ?? false;

  const recordsLimit =
    overLimit?.records.limit ?? usage?.maxRecordsPerMonth ?? null;
  const recordsCount =
    overLimit?.records.count ?? usage?.recordsSynced ?? 0;
  const recordsOver = overLimit?.records.over ?? false;

  const resources: ResourceItemData[] = [
    {
      key: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      count: projectsCount,
      limit: projectsLimit,
      over: projectsOver,
      colorGradient: 'from-blue-500 to-indigo-500',
    },
    {
      key: 'jobs',
      label: 'Jobs',
      icon: Package,
      count: jobsCount,
      limit: jobsLimit,
      over: jobsOver,
      colorGradient: 'from-purple-500 to-violet-500',
    },
    {
      key: 'members',
      label: 'Members',
      icon: Users,
      count: membersCount,
      limit: membersLimit,
      over: membersOver,
      colorGradient: 'from-success to-teal-600',
    },
    {
      key: 'records',
      label: 'Records this period',
      icon: Database,
      count: recordsCount,
      limit: recordsLimit,
      over: recordsOver,
      colorGradient: 'from-amber-500 to-orange-500',
    },
  ];

  const formatLimitDisplay = (count: number, limit: number | null) => {
    if (limit === null) {
      return `${count.toLocaleString()} / Unlimited`;
    }
    return `${count.toLocaleString()} / ${limit.toLocaleString()}`;
  };

  const calculateWidth = (count: number, limit: number | null) => {
    if (limit === null) {
      // For unlimited: visual aesthetic indicator (between 15% and 25%)
      return count > 0 ? 20 : 0;
    }
    if (limit <= 0) return 0;
    return Math.min(100, Math.max(3, Math.round((count / limit) * 100)));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">
          Entitlements & Usage
        </h3>
        {onViewUsageDetails ? (
          <button
            type="button"
            onClick={onViewUsageDetails}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            View usage details &rarr;
          </button>
        ) : (
          <Link
            to={`/super-admin/organisations/${organisationId}/overview`}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            View usage details &rarr;
          </Link>
        )}
      </div>

      {/* Resource Meters Card */}
      <Card className="p-4">
        <CardContent className="p-0 space-y-4">
          {resources.map((res) => {
            const Icon = res.icon;
            const pct = calculateWidth(res.count, res.limit);
            const isUnlimited = res.limit === null;

            return (
              <div key={res.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span>{res.label}</span>
                  </div>
                  <span
                    className={cn(
                      'font-mono text-xs',
                      res.over
                        ? 'font-semibold text-destructive'
                        : isUnlimited
                          ? 'text-muted-foreground'
                          : 'font-medium text-foreground',
                    )}
                  >
                    {formatLimitDisplay(res.count, res.limit)}
                  </span>
                </div>

                {/* Progress Track */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                      res.over
                        ? 'from-red-500 to-rose-600'
                        : res.colorGradient,
                    )}
                    style={{ width: `${pct}%` }}
                    aria-label={`${res.label}: ${pct}%`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
