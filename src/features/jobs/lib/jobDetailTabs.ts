export type JobDetailTabId =
  | 'field-mapping'
  | 'pipeline'
  | 'schedule'
  | 'run-history'
  | 'conflicts'
  | 'webhook-events'
  | 'settings';

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

export const DEFAULT_TAB_ID: JobDetailTabId = 'field-mapping';

export const TAB_DEFS: JobDetailTabDef[] = [
  { id: 'field-mapping', label: 'Field Mapping' },
  {
    id: 'pipeline',
    label: 'Pipeline',
    visible: ({ pipelineRequired }) => pipelineRequired,
  },
  { id: 'schedule', label: 'Schedule' },
  { id: 'run-history', label: 'Run History' },
  { id: 'conflicts', label: 'Conflicts', visible: ({ isTwoWay }) => isTwoWay },
  {
    id: 'webhook-events',
    label: 'Webhook Events',
    visible: ({ isTwoWay }) => isTwoWay,
  },
  { id: 'settings', label: 'Settings' },
];
