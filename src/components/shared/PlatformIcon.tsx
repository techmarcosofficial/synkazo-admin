import { cn } from '@/lib/utils';

const PLATFORM_IMAGES: Record<string, string> = {
  hubspot: '/hubspot-logo.svg',
  servicetitan: '/servicetitan-logo.svg',
  dataforma: '/dataforma-logo.svg',
  texada: '/texada-logo.svg',
};

const PLATFORM_COLORS: Record<string, string> = {
  servicetitan: 'bg-servicetitan-tile',
  hubspot: 'bg-[#ff7a59]',
  salesforce: 'bg-[#1798c1]',
  dataforma: 'bg-background',
  texada: 'bg-background',
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
  const src = PLATFORM_IMAGES[key];

  return (
    <div
      className={cn(
        'bg-background inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
        PLATFORM_COLORS[key],
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
          className="h-[70%] w-[70%] object-contain"
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
