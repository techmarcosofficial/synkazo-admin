import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import StatusBadge from '@/components/shared/StatusBadge';

interface ProjectIdentityHeaderProps {
  name: string;
  sourcePlatformId: string | null;
  destPlatformId: string;
  syncMode?: string | null;
  activeEnvironment: string | null;
  subtitle: string;
  syncStatus?: string;
  statusControl: ReactNode;
  action?: ReactNode;
}

/** Project identity presentation shared by tenant and platform controllers. */
export default function ProjectIdentityHeader({
  name,
  sourcePlatformId,
  destPlatformId,
  syncMode,
  activeEnvironment,
  subtitle,
  syncStatus,
  statusControl,
  action,
}: ProjectIdentityHeaderProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <PlatformIcon
            platformId={sourcePlatformId ?? ''}
            variant="avatar"
            size="3xl"
            className="size-12 rounded-2xl"
          />
          {syncMode === 'two_way' ? (
            <ArrowLeftRight className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
          )}
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
          subtitle={subtitle}
        />
      </div>

      <div className="ml-auto flex flex-col items-end gap-1.5">
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {activeEnvironment && (
            <StatusBadge
              status={activeEnvironment}
              label={
                activeEnvironment === 'sandbox'
                  ? 'Sandbox'
                  : 'Production'
              }
              title={
                activeEnvironment === 'sandbox'
                  ? 'Operating in Sandbox — Live customer data is not affected'
                  : 'Production Sync active'
              }
              size="md"
              className="h-8 gap-2 px-3 text-sm font-medium"
            />
          )}
          {statusControl}
          {action}
        </div>
        {syncStatus && (
          <p className="text-muted-foreground text-sm">{syncStatus}</p>
        )}
      </div>
    </div>
  );
}
