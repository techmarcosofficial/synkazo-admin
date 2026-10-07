import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  MarketplaceCatalogEntry,
  PlatformFeatureFlag,
  UpsertFeatureFlagDto,
  UpsertMarketplaceCatalogEntryDto,
} from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

// GAP-023 — per-topic SA platform-settings surfaces. Two independent
// APIs (feature flags + marketplace catalog); the platform-overview
// endpoint separately carries the system-health block.

export const superAdminFeatureFlagsApi = {
  list: (): Promise<PlatformFeatureFlag[]> =>
    apiClient
      .get<{ data: PlatformFeatureFlag[] }>(
        '/super-admin/settings/feature-flags',
      )
      .then(d),

  upsert: (
    key: string,
    dto: UpsertFeatureFlagDto,
  ): Promise<PlatformFeatureFlag> =>
    apiClient
      .put<{ data: PlatformFeatureFlag }>(
        `/super-admin/settings/feature-flags/${encodeURIComponent(key)}`,
        dto,
      )
      .then(d),
};

export const superAdminMarketplaceApi = {
  list: (): Promise<MarketplaceCatalogEntry[]> =>
    apiClient
      .get<{ data: MarketplaceCatalogEntry[] }>(
        '/super-admin/settings/marketplace',
      )
      .then(d),

  upsert: (
    slug: string,
    dto: UpsertMarketplaceCatalogEntryDto,
  ): Promise<MarketplaceCatalogEntry> =>
    apiClient
      .patch<{ data: MarketplaceCatalogEntry }>(
        `/super-admin/settings/marketplace/${encodeURIComponent(slug)}`,
        dto,
      )
      .then(d),
};
