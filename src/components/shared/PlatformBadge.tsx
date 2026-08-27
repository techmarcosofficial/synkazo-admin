import { ArrowLeftRight, ArrowRight, Lock } from 'lucide-react';

import PlatformIcon from './PlatformIcon';

import { MOCK_PLATFORMS } from '@/lib/mockData';
import { cn } from '@/lib/utils';

/* Brand tokens (see index.css). Platforms without a dedicated brand token
   fall back to neutral surfaces. */
const BADGE_CLASS: Record<string, string> = {
  servicetitan: 'bg-servicetitan/10 border-servicetitan/30 text-servicetitan',
  hubspot: 'bg-hubspot/10 border-hubspot/30 text-hubspot',
  dataforma: 'bg-dataforma/10 border-dataforma/30 text-dataforma',
  texada: 'bg-texada/10 border-texada/30 text-texada',
  salesforce: 'bg-salesforce/10 border-salesforce/30 text-salesforce',
};

interface PlatformTileProps {
  platformId: string;
  size?: number;
  radius?: number;
}

export function PlatformTile({ platformId, size = 30 }: PlatformTileProps) {
  return <PlatformIcon platformId={platformId} size={size} />;
}

type AvatarSize = 'sm' | 'md' | 'lg';

const AVATAR_SIZES: Record<AvatarSize, { box: string; icon: number }> = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-9 w-9', icon: 18 },
  lg: { box: 'h-11 w-11', icon: 22 },
};

interface PlatformAvatarProps {
  platformId: string;
  size?: AvatarSize;
}

/**
 * Circular version of PlatformTile — same icon, wrapped in your shadcn
 * Avatar primitive with a brand-colored ring, so platform pairs read the
 * same way your AvatarGroup does elsewhere in the app.
 */
export function PlatformAvatar({
  platformId,
  size = 'lg',
}: PlatformAvatarProps) {
  const s = AVATAR_SIZES[size] ?? AVATAR_SIZES.md;
  return <PlatformIcon platformId={platformId} size={s.icon} />;
}

interface SyncArrowsProps {
  size?: number;
}

export function SyncArrows({ size = 18 }: SyncArrowsProps) {
  return (
    <ArrowLeftRight
      className="text-muted-foreground shrink-0"
      style={{ inlineSize: size, blockSize: size }}
    />
  );
}

type BadgeSize = 'sm' | 'md' | 'lg';

const BADGE_SIZES: Record<
  BadgeSize,
  { icon: number; text: string; gap: string; px: string }
> = {
  sm: { icon: 16, text: 'text-xs', gap: 'gap-1', px: 'px-1.5 py-0.5' },
  md: { icon: 20, text: 'text-sm', gap: 'gap-1.5', px: 'px-2 py-1' },
  lg: { icon: 26, text: 'text-base', gap: 'gap-2', px: 'px-3 py-1.5' },
};

interface PlatformBadgeProps {
  platformId: string;
  showName?: boolean;
  size?: BadgeSize;
  showStatus?: boolean;
}

function PlatformBadge({
  platformId,
  showName = true,
  size = 'md',
  showStatus = false,
}: PlatformBadgeProps) {
  const platform = MOCK_PLATFORMS.find(
    (p: { id: string }) => p.id === platformId,
  );
  if (!platform) return null;

  const isComingSoon = platform.status === 'coming_soon';
  const s = BADGE_SIZES[size] ?? BADGE_SIZES.md;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border font-medium',
        s.gap,
        s.text,
        s.px,
        BADGE_CLASS[platformId] ??
          'bg-muted border-border text-muted-foreground',
        isComingSoon && 'opacity-60',
      )}
    >
      <PlatformIcon platformId={platformId} size={s.icon} />
      {showName && <span>{platform.name}</span>}
      {isComingSoon && showStatus && <Lock className="size-2.5 opacity-70" />}
    </span>
  );
}

export { PlatformBadge };
export default PlatformBadge;

interface PlatformPairDisplayProps {
  sourcePlatformId: string;
  destPlatformId: string;
  direction?: 'one_way' | 'two_way';
  size?: BadgeSize;
  /** "badge" = your existing pill style. "avatar" = circular, ringed icons. */
  variant?: 'badge' | 'avatar';
}

export function PlatformPairDisplay({
  sourcePlatformId,
  destPlatformId,
  direction = 'one_way',
  size = 'sm',
  variant = 'badge',
}: PlatformPairDisplayProps) {
  const Arrow = direction === 'two_way' ? ArrowLeftRight : ArrowRight;

  if (variant === 'avatar') {
    // BadgeSize and AvatarSize share the same "sm" | "md" | "lg" keys, so
    // this passes through directly.
    return (
      <div className="flex items-center gap-2">
        <PlatformAvatar
          platformId={sourcePlatformId}
          size={size as AvatarSize}
        />
        <Arrow className="text-muted-foreground size-4 shrink-0" />
        <PlatformAvatar platformId={destPlatformId} size={size as AvatarSize} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <PlatformBadge platformId={sourcePlatformId} size={size} />
      <Arrow className="text-muted-foreground size-4" />
      <PlatformBadge platformId={destPlatformId} size={size} />
    </div>
  );
}
