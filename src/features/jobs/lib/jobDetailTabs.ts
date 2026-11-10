export type JobDetailTabId =
  | 'overview'
  | 'field-mapping'
  | 'run-sync'
  | 'pipeline'
  | 'schedule'
  | 'settings';

/**
 * Sync History, Conflicts and Webhook Events used to be tabs and are now
 * sections of the Settings page. Old `?tab=` links land on their section.
 */
export const LEGACY_SETTINGS_SECTION_TABS: Record<string, string> = {
  'run-history': 'sync-history',
  'sync-history': 'sync-history',
  conflicts: 'conflicts',
  'webhook-events': 'webhook-events',
};

export interface JobDetailTabContext {
  pipelineRequired: boolean;
  isTwoWay: boolean;
}

export interface JobDetailTabDef {
  id: JobDetailTabId;
  label: string;
  /** Omitted entirely when false — unlike Projects' tabs, Job tabs are never shown-but-locked. */
  visible?: (ctx: JobDetailTabContext) => boolean;
}

export const DEFAULT_TAB_ID: JobDetailTabId = 'overview';

export const TAB_DEFS: JobDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'field-mapping', label: 'Field Mapping' },
  { id: 'run-sync', label: 'Run Sync' },
  {
    id: 'pipeline',
    label: 'Pipeline',
    visible: ({ pipelineRequired }) => pipelineRequired,
  },
  { id: 'settings', label: 'Settings' },
];
