import { formatDistanceToNow } from 'date-fns';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatEntityLabel } from '@/features/projects/lib/syncJobSummary';

export interface JobIdentityHeaderProps {
  name: string;
  projectName: string;
  contextLabel?: string;
  sourcePlatformId: string;
  destPlatformId: string;
  sourceObject: string;
  destObject: string;
  syncDirection?: string | null;
  lastSyncedAt: string | null;
  activeEnvironment?: string | null;
  operationalStatus?: string | null;
  statusControl: ReactNode;
}

export default function JobIdentityHeader({
  name,
  projectName,
  contextLabel,
  sourcePlatformId,
  destPlatformId,
  sourceObject,
  destObject,
  syncDirection,
  lastSyncedAt,
  activeEnvironment,
  operationalStatus,
  statusControl,
}: JobIdentityHeaderProps) {
  const twoWay = syncDirection === 'two_way';
  const DirectionIcon = twoWay ? ArrowLeftRight : ArrowRight;
  const lastSyncedLabel = lastSyncedAt
    ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }).replace(
        'about ',
        '',
      )
    : 'Never synced';

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <PlatformIcon
            platformId={sourcePlatformId}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
          <DirectionIcon className="text-muted-foreground size-4 shrink-0" />
          <PlatformIcon
            platformId={destPlatformId}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
        </div>
        <HeadingPair
          level="h1"
          title={<span className="block truncate">{name}</span>}
          trailing={statusControl}
          subtitle={
            <>
              {contextLabel && (
                <>
                  <span>{contextLabel}</span>
                  <span aria-hidden="true"> · </span>
                </>
              )}
              <span>{projectName}</span>
              <span aria-hidden="true"> · </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="truncate">
                  {formatEntityLabel(sourceObject)}
                </span>
                <DirectionIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {formatEntityLabel(destObject)}
                </span>
              </span>
              <span aria-hidden="true"> · </span>
              <span>{lastSyncedLabel}</span>
            </>
          }
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <StatusBadge status={twoWay ? 'two_way' : 'one_way'} size="lg" />
        {activeEnvironment && (
          <StatusBadge
            status={activeEnvironment}
            label={
              activeEnvironment === 'sandbox'
                ? 'Sandbox (Test Mode)'
                : 'Production (Live)'
            }
            title={
              activeEnvironment === 'sandbox'
                ? 'Operating in Sandbox — Live customer data is not affected'
                : 'Live Production Sync active'
            }
            size="sm"
          />
        )}
        {operationalStatus && (
          <StatusBadge status={operationalStatus} size="sm" />
        )}
      </div>
    </div>
  );
}
