/**
 * Centralized platform metadata and helpers.
 * All platform lookups, colors, images, and status info live here.
 */

export interface Platform {
  id: string;
  name: string;
  color: string; // hex color code
  status: 'live' | 'coming_soon';
  category: 'field_service' | 'crm' | 'roofing' | 'accounting' | 'automation';
  logoUrl?: string; // optional logo URL
}

/**
 * All platforms with their metadata.
 * Keep this as the single source of truth.
 */
export const PLATFORMS: Record<string, Platform> = {
  servicetitan: {
    id: 'servicetitan',
    name: 'ServiceTitan',
    color: '#FF6B2C',
    status: 'live',
    category: 'field_service',
    logoUrl: '/servicetitan-logo.svg',
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    color: '#FF7A59',
    status: 'live',
    category: 'crm',
    logoUrl: '/hubspot-logo.svg',
  },
  dataforma: {
    id: 'dataforma',
    name: 'Dataforma',
    color: '#0E76A8',
    status: 'live',
    category: 'roofing',
    logoUrl: '/dataforma-logo.png',
  },
  texada: {
    id: 'texada',
    name: 'Texada',
    color: '#00ADEF',
    status: 'live',
    category: 'field_service',
    logoUrl: '/texada-logo.png',
  },
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    color: '#00A1E0',
    status: 'coming_soon',
    category: 'crm',
  },
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks',
    color: '#2CA01C',
    status: 'coming_soon',
    category: 'accounting',
  },
  zapier: {
    id: 'zapier',
    name: 'Zapier',
    color: '#FF4A00',
    status: 'coming_soon',
    category: 'automation',
  },
};

/**
 * Tailwind badge styling per platform.
 * Each entry is className for the badge's bg, border, and text color.
 */
export const PLATFORM_BADGE_CLASSES: Record<string, string> = {
  servicetitan: 'bg-servicetitan text-servicetitan',
  hubspot: 'bg-hubspot text-hubspot',
  dataforma: 'bg-dataforma text-dataforma',
  texada: 'bg-texada text-texada',
  salesforce: 'bg-salesforce text-salesforce',
};

/**
 * Platform logo URL or fallback.
 * Returns the logo URL if available, undefined otherwise.
 */
export function getPlatformLogoUrl(platformId: string): string | undefined {
  return PLATFORMS[platformId]?.logoUrl;
}

/**
 * Get a platform by ID.
 * Returns the platform object or undefined if not found.
 */
export function getPlatform(platformId: string): Platform | undefined {
  return PLATFORMS[platformId];
}

/**
 * Get initials from platform name (fallback for missing logo).
 */
export function getPlatformInitials(platformId: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform) return '?';

  return platform.name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Get badge class for a platform (or fallback if not found).
 */
export function getPlatformBadgeClass(platformId: string): string {
  return (
    PLATFORM_BADGE_CLASSES[platformId] ||
    'bg-muted border-border text-muted-foreground'
  );
}

/**
 * Check if platform is coming soon.
 */
export function isPlatformComingSoon(platformId: string): boolean {
  return getPlatform(platformId)?.status === 'coming_soon';
}

/**
 * Get all platforms as an array (useful for iteration).
 */
export function getAllPlatforms(): Platform[] {
  return Object.values(PLATFORMS);
}
