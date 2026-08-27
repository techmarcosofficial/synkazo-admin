import type { Connection, PlatformId } from '@/types';

export type ExtConnection = Connection & {
  platformId: PlatformId | string;
  connectionType: string;
  providerMetadata?: { installSource?: 'marketplace' | 'manual' };
};

export interface TestResult {
  ok: boolean;
  msg: string;
}

export interface MissingSlot {
  platformId: string;
  connectionType: 'source' | 'destination';
}
