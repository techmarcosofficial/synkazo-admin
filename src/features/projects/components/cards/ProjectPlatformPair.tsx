import { ArrowLeftRight, ArrowRight, CircleHelp } from 'lucide-react';

import { PlatformIcon, getPlatform } from '@/components/platform';
import type { ProjectSyncMode } from '@/types';

interface ProjectPlatformPairProps {
  sourcePlatformId: string | null;
  destPlatformId: string;
  syncMode?: ProjectSyncMode | null;
  size?: 'md' | '2xl';
}

export default function ProjectPlatformPair({
  sourcePlatformId,
  destPlatformId,
  syncMode,
  size = 'md',
}: ProjectPlatformPairProps) {
  const isTwoWay = syncMode === 'two_way';
  const DirectionIcon = isTwoWay ? ArrowLeftRight : ArrowRight;
  const directionLabel = isTwoWay ? 'Two-way sync' : 'One-way sync';
  const sourceName = sourcePlatformId
    ? (getPlatform(sourcePlatformId)?.name ?? sourcePlatformId)
    : 'Source platform not selected';
  const destinationName = getPlatform(destPlatformId)?.name ?? destPlatformId;
  const placeholderSize = size === '2xl' ? 'size-8' : 'size-4';

  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={`${directionLabel}: ${sourceName} and ${destinationName}`}
    >
      {sourcePlatformId ? (
        <PlatformIcon
          platformId={sourcePlatformId}
          variant="avatar"
          size={size}
        />
      ) : (
        <span
          className={`bg-muted text-muted-foreground flex items-center justify-center rounded-xl ${placeholderSize}`}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </span>
      )}
      <DirectionIcon
        className="text-muted-foreground size-4 shrink-0"
        aria-hidden="true"
      />
      <PlatformIcon platformId={destPlatformId} variant="avatar" size={size} />
    </div>
  );
}
