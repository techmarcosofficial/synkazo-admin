import { ArrowLeftRight, ArrowRight } from 'lucide-react';

import { PlatformIcon } from './PlatformIcon';

import { cn } from '@/lib/utils';

type Variant = 'avatar' | 'text' | 'icon-text' | 'badge';
type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
type Direction = 'one_way' | 'two_way';

interface PlatformPairProps {
  sourcePlatformId: string;
  destPlatformId: string;
  variant?: Variant;
  size?: Size;
  direction?: Direction;
  showStatus?: boolean; // Show lock icon if coming_soon (badge only)
  className?: string;
  arrowClassName?: string;
}

/**
 * PlatformPair renders a source and destination platform with an arrow between them.
 * Both platforms use the same variant and size for consistency.
 *
 * Examples:
 * - <PlatformPair sourcePlatformId="servicetitan" destPlatformId="hubspot" variant="badge" />
 * - <PlatformPair sourcePlatformId="servicetitan" destPlatformId="hubspot" variant="avatar" direction="two_way" />
 */
export function PlatformPair({
  sourcePlatformId,
  destPlatformId,
  variant = 'avatar',
  size = 'md',
  direction = 'one_way',
  showStatus = false,
  className,
  arrowClassName,
}: PlatformPairProps) {
  const Arrow = direction === 'two_way' ? ArrowLeftRight : ArrowRight;

  // Arrow size depends on variant
  const arrowSize = variant === 'badge' ? 12 : 14;

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <PlatformIcon
        platformId={sourcePlatformId}
        variant={variant}
        size={size}
        showStatus={showStatus}
      />
      <Arrow
        className={cn('text-muted-foreground shrink-0', arrowClassName)}
        style={{ width: arrowSize, height: arrowSize }}
      />
      <PlatformIcon
        platformId={destPlatformId}
        variant={variant}
        size={size}
        showStatus={showStatus}
      />
    </div>
  );
}

export default PlatformPair;
