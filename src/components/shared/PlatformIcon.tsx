import { cn } from '@/lib/utils';
import {
  getPlatformLogoImageClass,
  getPlatformLogoTileClass,
  getPlatformLogoUrl,
} from '@/components/platform/platform';

const PLATFORM_COLORS: Record<string, string> = {
  salesforce: 'bg-[#1798c1]',
};

interface PlatformIconProps {
  platformId: string;
  size?: number;
  className?: string;
}

function initials(name: string) {
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PlatformIcon({
  platformId,
  size = 30,
  className,
}: PlatformIconProps) {
  const key = platformId.toLowerCase();
  const src = getPlatformLogoUrl(key);

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
        src ? getPlatformLogoTileClass(key) : PLATFORM_COLORS[key] ?? 'bg-background',
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={platformId}
          draggable={false}
          className={getPlatformLogoImageClass(key)}
        />
      ) : (
        <span className="text-foreground text-xs font-semibold">
          {initials(platformId)}
        </span>
      )}
    </div>
  );
}

export { PlatformIcon };
