export type JobDetailTabId =
  | 'overview'
  | 'field-mapping'
  | 'pipeline'
  | 'schedule'
  | 'run-history'
  | 'conflicts'
  | 'webhook-events'
  | 'settings';

export interface JobDetailTabContext {
  pipelineRequired: boolean;
  runLogCount: number;
  isTwoWay: boolean;
}

export interface JobDetailTabDef {
  id: JobDetailTabId;
  label: string;
  /** Omitted entirely when false — unlike Projects' tabs, Job tabs are never shown-but-locked. */
  visible?: (ctx: JobDetailTabContext) => boolean;
  badge?: (ctx: JobDetailTabContext) => number | null;
}

export const DEFAULT_TAB_ID: JobDetailTabId = 'overview';

export const TAB_DEFS: JobDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'field-mapping', label: 'Field Mapping' },
  {
    id: 'pipeline',
    label: 'Pipeline',
    visible: ({ pipelineRequired }) => pipelineRequired,
  },
  { id: 'schedule', label: 'Schedule' },
  {
    id: 'run-history',
    label: 'Run History',
    badge: ({ runLogCount }) => runLogCount || null,
  },
  { id: 'conflicts', label: 'Conflicts', visible: ({ isTwoWay }) => isTwoWay },
  {
    id: 'webhook-events',
    label: 'Webhook Events',
    visible: ({ isTwoWay }) => isTwoWay,
  },
  { id: 'settings', label: 'Settings' },
];
