import { Lock } from 'lucide-react';

import {
  getPlatform,
  getPlatformLogoUrl,
  getPlatformInitials,
  getPlatformBadgeClass,
  isPlatformComingSoon,
} from './platform';

import { cn } from '@/lib/utils';

type Variant = 'avatar' | 'text' | 'icon-text' | 'badge';
type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Size configuration for each variant and size combo.
 * Defines icon size, text class, gap, and padding.
 *
 * `icon` is a Tailwind `size-*` class (tied to the app's spacing scale)
 * rather than a raw pixel value, so named sizes stay on-token. A caller
 * can still pass a numeric `size` prop for a one-off pixel size — see
 * `customIconSize` below — which intentionally falls outside this scale.
 */
const SIZE_CONFIG: Record<
  Variant,
  Record<
    Size,
    {
      icon: string;
      text: string;
      gap: string;
      px: string;
    }
  >
> = {
  avatar: {
    sm: { icon: 'size-3.5', text: '', gap: '', px: '' },
    md: { icon: 'size-4', text: '', gap: '', px: '' },
    lg: { icon: 'size-5', text: '', gap: '', px: '' },
    xl: { icon: 'size-6', text: '', gap: '', px: '' },
    '2xl': { icon: 'size-8', text: '', gap: '', px: '' },
    '3xl': { icon: 'size-9', text: '', gap: '', px: '' },
  },
  text: {
    sm: { icon: '', text: 'text-xs', gap: '', px: '' },
    md: { icon: '', text: 'text-sm', gap: '', px: '' },
    lg: { icon: '', text: 'text-base', gap: '', px: '' },
    xl: { icon: '', text: 'text-lg', gap: '', px: '' },
    '2xl': { icon: '', text: 'text-xl', gap: '', px: '' },
    '3xl': { icon: '', text: 'text-2xl', gap: '', px: '' },
  },
  'icon-text': {
    sm: {
      icon: 'size-3.5',
      text: 'text-xs',
      gap: 'gap-1',
      px: 'px-1.5 py-0.5',
    },
    md: { icon: 'size-4', text: 'text-sm', gap: 'gap-1.5', px: 'px-2 py-1' },
    lg: { icon: 'size-6', text: 'text-base', gap: 'gap-2', px: 'px-3 py-1.5' },
    xl: { icon: 'size-7', text: 'text-lg', gap: 'gap-2', px: 'px-3.5 py-2' },
    '2xl': { icon: 'size-9', text: 'text-xl', gap: 'gap-2.5', px: 'px-4 py-2' },
    '3xl': {
      icon: 'size-11',
      text: 'text-2xl',
      gap: 'gap-3',
      px: 'px-4 py-2.5',
    },
  },
  badge: {
    sm: {
      icon: 'size-3.5',
      text: 'text-xs',
      gap: 'gap-1',
      px: 'px-1.5 py-0.5',
    },
    md: { icon: 'size-4', text: 'text-sm', gap: 'gap-1.5', px: 'px-2 py-1' },
    lg: { icon: 'size-6', text: 'text-base', gap: 'gap-2', px: 'px-3 py-1.5' },
    xl: { icon: 'size-7', text: 'text-lg', gap: 'gap-2', px: 'px-3.5 py-2' },
    '2xl': { icon: 'size-9', text: 'text-xl', gap: 'gap-2.5', px: 'px-4 py-2' },
    '3xl': {
      icon: 'size-11',
      text: 'text-2xl',
      gap: 'gap-3',
      px: 'px-4 py-2.5',
    },
  },
};

interface PlatformIconProps {
  platformId: string;
  variant?: Variant;
  size?: Size | number; // Support both new sizes and legacy pixel values
  showStatus?: boolean; // Show lock icon if coming_soon (badge only)
  className?: string;
}

/**
 * PlatformIcon renders a single platform with four display styles:
 * - avatar: Icon only, circular box
 * - text: Platform name only
 * - icon-text: Icon + name (no badge styling)
 * - badge: Icon + name inside a styled badge with brand colors
 *
 * Supports both new Size type ("sm", "md", "lg", "xl", "2xl", "3xl") and
 * legacy numeric pixel sizes for backward compatibility.
 */
export function PlatformIcon({
  platformId,
  variant = 'avatar',
  size = 'md',
  showStatus = false,
  className,
}: PlatformIconProps) {
  const platform = getPlatform(platformId);
  if (!platform) return null;

  // Convert numeric size to closest named size, or use named size
  let actualSize: Size = 'md';
  let customIconSize: number | undefined;

  if (typeof size === 'number') {
    // Backward compatibility: map pixel sizes to nearest named size
    if (size <= 16) actualSize = 'sm';
    else if (size <= 18) actualSize = 'md';
    else if (size <= 22) actualSize = 'lg';
    else if (size <= 28) actualSize = 'xl';
    else if (size <= 36) actualSize = '2xl';
    else actualSize = '3xl';
    customIconSize = size; // Use custom size for avatar
  } else {
    actualSize = size;
  }

  const config = SIZE_CONFIG[variant]?.[actualSize] || SIZE_CONFIG[variant]?.md;
  const isComingSoon = isPlatformComingSoon(platformId);
  const logoUrl = getPlatformLogoUrl(platformId);
  const initials = getPlatformInitials(platformId);
  const badgeClass = getPlatformBadgeClass(platformId);
  // Named sizes render via the token-based `size-*` class in config.icon;
  // an explicit numeric `size` prop is a deliberate escape hatch for a
  // one-off pixel size and renders via inline style instead.
  const iconSizeClass = customIconSize ? undefined : config.icon;
  const iconStyle = customIconSize
    ? { width: customIconSize, height: customIconSize }
    : undefined;

  // avatar: circular icon only
  if (variant === 'avatar') {
    return (
      <div
        className={cn(
          badgeClass,
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
          iconSizeClass,
          className,
        )}
        style={iconStyle}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={platform.name}
            draggable={false}
            className="h-[85%] w-[85%] object-contain"
          />
        ) : (
          <span className="text-foreground text-xs font-semibold">
            {initials}
          </span>
        )}
      </div>
    );
  }

  // text: name only
  if (variant === 'text') {
    return (
      <span className={cn('font-medium', config.text, className)}>
        {platform.name}
      </span>
    );
  }

  // icon-text: icon + name (no badge styling)
  if (variant === 'icon-text') {
    return (
      <div
        className={cn(
          'inline-flex shrink-0 items-center',
          config.gap,
          className,
        )}
      >
        <div
          className={cn(
            'bg-background inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
            iconSizeClass,
          )}
          style={iconStyle}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={platform.name}
              draggable={false}
              className="h-[70%] w-[70%] object-contain"
            />
          ) : (
            <span className="text-foreground text-xs font-semibold">
              {initials}
            </span>
          )}
        </div>
        <span className={cn('font-medium', config.text)}>{platform.name}</span>
      </div>
    );
  }

  // badge: icon + name inside a styled badge with brand colors
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-lg border font-medium',
          config.gap,
          config.text,
          config.px,
          badgeClass,
          isComingSoon && 'opacity-60',
          className,
        )}
      >
        <div
          className={cn(
            'bg-background inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg',
            iconSizeClass,
          )}
          style={iconStyle}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={platform.name}
              draggable={false}
              className="h-[70%] w-[70%] object-contain"
            />
          ) : (
            <span className="text-foreground text-xs font-semibold">
              {initials}
            </span>
          )}
        </div>
        <span>{platform.name}</span>
        {isComingSoon && showStatus && <Lock className="size-2.5 opacity-70" />}
      </span>
    );
  }

  return null;
}

export default PlatformIcon;
