import type { PlatformId } from '@/types';

const SUPPORTS_CUSTOM_OBJECTS = new Set<PlatformId>(['hubspot']);

export function supportsCustomObjects(
  platformId: PlatformId | string,
): boolean {
  return SUPPORTS_CUSTOM_OBJECTS.has(platformId as PlatformId);
}
