import type { PlatformId } from './connection';

export type ProjectEnvironment = 'production' | 'sandbox';
export type ProjectStatus = 'active' | 'draft' | 'paused' | 'error';
/** Project-level one-way/two-way gate. Null on legacy projects created before
 *  the feature shipped — treated as unrestricted (both directions selectable). */
export type ProjectSyncMode = 'one_way' | 'two_way';
export type SchedulerMode = 'individual' | 'priority';

export interface Project {
  id: string;
  name: string;
  description?: string;
  organisationId: string;
  /** Null until the operator picks a source — HubSpot-Marketplace projects start
   *  sourceless and the source is chosen once, post-install. */
  sourcePlatformId: PlatformId | null;
  destPlatformId: PlatformId;
  /** One-time, immutable gate on which job sync directions this project allows.
   *  Null = legacy/unrestricted (both one-way and two-way jobs selectable). */
  syncMode?: ProjectSyncMode | null;
  status: ProjectStatus;
  active_environment?: ProjectEnvironment;
  /** Non-null once the project has completed the guided setup wizard (one-way ratchet). */
  setupCompletedAt?: string | null;
  schedulerMode?: SchedulerMode;
  lastSyncedAt?: string | null;
  totalRecordsSynced?: number;
  totalErrorCount?: number;
  jobCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
