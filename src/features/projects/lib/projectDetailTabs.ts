export type ProjectDetailTabId =
  'overview' | 'connections' | 'sync-rules' | 'activity' | 'settings';

export interface ProjectDetailTabRequirements {
  connections: boolean;
  jobs: boolean;
}

export interface ProjectDetailTabDef {
  id: ProjectDetailTabId;
  label: string;
  requires?: ProjectDetailTabRequirements;
}

export const DEFAULT_TAB_ID: ProjectDetailTabId = 'overview';

export const TAB_DEFS: ProjectDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'connections', label: 'Connections' },
  {
    id: 'sync-rules',
    label: 'Sync Jobs',
    requires: { connections: true, jobs: false },
  },
  {
    id: 'activity',
    label: 'Activity',
    requires: { connections: true, jobs: true },
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
