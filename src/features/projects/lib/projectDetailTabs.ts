import type { AssociationRule } from '@/api/associations';
import type {
  ConnectionExt,
  JobExt,
  ProjectActivityLog,
} from '@/features/projects/hooks/useProjectDetail';

export type ProjectDetailTabId =
  | 'overview'
  | 'connections'
  | 'sync-rules'
  | 'scheduler'
  | 'associations'
  | 'environment-sync'
  | 'activity'
  | 'settings';

export interface ProjectDetailTabRequirements {
  connections: boolean;
  jobs: boolean;
}

export interface ProjectDetailTabDef {
  id: ProjectDetailTabId;
  label: string;
  requires?: ProjectDetailTabRequirements;
  badge?: (data: {
    jobs: JobExt[];
    connections: ConnectionExt[];
    associationRules: AssociationRule[];
    logs: ProjectActivityLog[];
  }) => number | null;
}

export const DEFAULT_TAB_ID: ProjectDetailTabId = 'overview';

export const TAB_DEFS: ProjectDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'connections',
    label: 'Connections',
    badge: ({ connections }) => connections.length || null,
  },
  {
    id: 'sync-rules',
    label: 'Sync Jobs',
    requires: { connections: true, jobs: false },
    badge: ({ jobs }) => jobs.length || null,
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    requires: { connections: true, jobs: true },
  },
  {
    id: 'associations',
    label: 'Associations',
    requires: { connections: true, jobs: true },
    badge: ({ associationRules }) => associationRules.length || null,
  },
  {
    id: 'environment-sync',
    label: 'Environment Sync',
    requires: { connections: true, jobs: true },
  },
  {
    id: 'activity',
    label: 'Activity',
    requires: { connections: true, jobs: true },
    badge: ({ logs }) => logs.length || null,
  },
  { id: 'settings', label: 'Settings' },
];

export function isTabLocked(
  tab: ProjectDetailTabDef,
  hasBothConnections: boolean,
  hasJobs: boolean,
): boolean {
  if (!tab.requires) return false;
  if (tab.requires.connections && !hasBothConnections) return true;
  if (tab.requires.jobs && (!hasBothConnections || !hasJobs)) return true;
  return false;
}

export function lockReasonFor(
  tab: ProjectDetailTabDef,
  hasBothConnections: boolean,
  hasJobs: boolean,
): string {
  if (!tab.requires) return '';
  if (!hasBothConnections)
    return 'Add source and destination connections first';
  if (tab.requires.jobs && !hasJobs)
    return 'Create at least one job to unlock this tab';
  return '';
}
