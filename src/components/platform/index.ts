/**
 * Platform components and utilities.
 *
 * Usage:
 *
 * import { PlatformIcon, PlatformPair } from "@/components/platform";
 *
 * <PlatformIcon platformId="hubspot" variant="badge" />
 * <PlatformPair sourcePlatformId="servicetitan" destPlatformId="hubspot" variant="avatar" />
 */

export { PlatformIcon } from './PlatformIcon';
export { PlatformPair } from './PlatformPair';
export {
  PLATFORMS,
  PLATFORM_BADGE_CLASSES,
  getPlatform,
  getPlatformLogoUrl,
  getPlatformInitials,
  getPlatformBadgeClass,
  isPlatformComingSoon,
  getAllPlatforms,
  type Platform,
} from './platform';
