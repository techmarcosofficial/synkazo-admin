// Typed schema for the plan feature/limit keys stored as strings in `membership_features`
// (see backend/src/billing/plan-catalog.seed.ts for the canonical key list + example values,
// and backend/src/billing/plan-features.service.ts for how the "enforced" subset is parsed).
// This schema is the single source of truth the admin UI renders form fields from — no more
// raw JSON editing.

export type FeatureFieldType =
  'number' | 'checkbox' | 'radio' | 'multicheckbox';

export interface FeatureFieldOption {
  value: string;
  label: string;
}

export interface FeatureFieldDef {
  key: string;
  label: string;
  group: string;
  type: FeatureFieldType;
  helperText?: string;
  /** number fields only: shows an "Unlimited" toggle that stores "-1". */
  allowUnlimited?: boolean;
  /** number fields only: value may be left blank (stored as ""). */
  allowBlank?: boolean;
  /** radio / multicheckbox fields only. */
  options?: FeatureFieldOption[];
  /** checkbox fields only: stored value when checked/unchecked. Defaults to "true"/"false". */
  trueValue?: string;
  falseValue?: string;
  /** Seed value used when a brand-new plan is created. */
  defaultValue: string;
  /**
   * Excluded from the generic form renderer — its value is still seeded/tracked (via
   * defaultFeatureValues and the create-plan lock list) but a composite field elsewhere
   * (e.g. SyncScheduleField, ObjectsScopeField in PlanManagementPage.tsx) owns its UI.
   */
  hidden?: boolean;
}

const SCHEDULING_MODE_OPTIONS: FeatureFieldOption[] = [
  { value: 'daily_time', label: 'Daily time' },
  { value: 'interval', label: 'Interval' },
  { value: 'day_specific', label: 'Day specific' },
];

const TRANSFORM_TYPE_OPTIONS: FeatureFieldOption[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'date_format', label: 'Date format' },
  { value: 'value_map', label: 'Value map' },
  { value: 'concat', label: 'Concat' },
  { value: 'static', label: 'Static' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'number', label: 'Number' },
];

const SYNC_DIRECTION_OPTIONS: FeatureFieldOption[] = [
  { value: 'one_way', label: 'One-way' },
  { value: 'two_way', label: 'Two-way' },
];

/** The 5 cadences SyncScheduleField renders as one merged "Sync Schedule" checkbox list. */
export const SYNC_FREQUENCY_OPTIONS: FeatureFieldOption[] = [
  { value: 'realtime', label: 'Real time' },
  { value: '15min', label: 'Every 15 minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily at a set time' },
  { value: 'custom', label: 'Custom (user-defined)' },
];

export const FEATURE_GROUPS = [
  'Limits',
  'Scheduling & transforms',
  'Sync scope',
  'Capabilities',
  'Trial',
  'Display',
] as const;

export const PLAN_FEATURE_FIELDS: FeatureFieldDef[] = [
  // ── Limits ──────────────────────────────────────────────────────────────────
  {
    key: 'max_projects',
    label: 'Max projects',
    group: 'Limits',
    type: 'number',
    allowUnlimited: true,
    defaultValue: '1',
  },
  {
    key: 'max_jobs',
    label: 'Max sync jobs',
    group: 'Limits',
    type: 'number',
    allowUnlimited: true,
    defaultValue: '2',
  },
  {
    key: 'max_records_monthly',
    label: 'Max records / month',
    group: 'Limits',
    type: 'number',
    allowUnlimited: true,
    defaultValue: '1000',
  },
  {
    key: 'max_team_members',
    label: 'Max team members',
    group: 'Limits',
    type: 'number',
    allowUnlimited: true,
    defaultValue: '1',
  },
  {
    key: 'log_history_days',
    label: 'Log history (days)',
    group: 'Limits',
    type: 'number',
    defaultValue: '7',
  },
  {
    key: 'min_interval_minutes',
    label: 'Minimum sync interval (minutes)',
    group: 'Limits',
    type: 'number',
    allowBlank: true,
    helperText: 'Leave blank if the plan has no interval-based scheduling.',
    defaultValue: '',
  },

  // ── Scheduling & transforms ────────────────────────────────────────────────
  // scheduling_modes and sync_frequency are both still real, independently-enforced feature
  // keys (see PlanFeaturesService) — they're just no longer edited as two separate controls.
  // SyncScheduleField (in PlanManagementPage.tsx) is the one visible "Sync Schedule" control;
  // it writes sync_frequency directly from what the admin picks and derives scheduling_modes
  // from that selection, so these two stay hidden from the generic form renderer.
  {
    key: 'scheduling_modes',
    label: 'Scheduling modes',
    group: 'Scheduling & transforms',
    type: 'multicheckbox',
    options: SCHEDULING_MODE_OPTIONS,
    defaultValue: 'daily_time',
    hidden: true,
  },
  {
    key: 'sync_frequency',
    label: 'Sync Schedule',
    group: 'Scheduling & transforms',
    type: 'multicheckbox',
    options: SYNC_FREQUENCY_OPTIONS,
    helperText: 'Which cadences a project on this plan can schedule a job for.',
    defaultValue: 'daily',
    hidden: true,
  },
  {
    key: 'allowed_transform_types',
    label: 'Allow Transformation',
    group: 'Scheduling & transforms',
    type: 'checkbox',
    trueValue: TRANSFORM_TYPE_OPTIONS.map((o) => o.value).join(','),
    falseValue: 'direct',
    helperText:
      'Enables the field-transform rule builder (date format, value map, concat, etc). Off means plain 1:1 field mapping only.',
    defaultValue: 'direct',
  },

  // ── Sync scope ──────────────────────────────────────────────────────────────
  {
    key: 'sync_direction',
    label: 'Sync direction',
    group: 'Sync scope',
    type: 'multicheckbox',
    options: SYNC_DIRECTION_OPTIONS,
    helperText:
      'Which modes a project can be created with. Two-way also unlocks the two-way job type.',
    defaultValue: 'one_way',
  },
  // Rendered by ObjectsScopeField (PlanManagementPage.tsx) as two toggles — "Include extended
  // objects" / "Include custom objects" — instead of this 4-option radio. Core is always
  // included. Still the same enforced `objects_synced` key underneath (see objectScopeAllows).
  {
    key: 'objects_synced',
    label: 'Objects synced',
    group: 'Sync scope',
    type: 'radio',
    options: [
      { value: 'core', label: 'Core objects only' },
      { value: 'core_extended', label: 'Core + extended objects' },
      { value: 'core_custom', label: 'Core + custom objects' },
      { value: 'all_custom', label: 'All + custom objects' },
    ],
    helperText:
      'Core = primary CRM records (HubSpot Core CRM, ServiceTitan CRM). Everything else standard is extended.',
    defaultValue: 'core',
    hidden: true,
  },
  {
    key: 'field_mapping',
    label: 'Allow add field',
    group: 'Sync scope',
    type: 'checkbox',
    trueValue: 'custom',
    falseValue: 'standard',
    helperText:
      'Enables the "+ Add mapping" button so users can build field mappings by hand, beyond the auto-mapped presets.',
    defaultValue: 'standard',
  },

  // ── Capabilities ────────────────────────────────────────────────────────────
  {
    key: 'association_rules',
    label: 'Association rules',
    group: 'Capabilities',
    type: 'checkbox',
    defaultValue: 'false',
  },
  {
    key: 'custom_objects',
    label: 'Create Custom Objects',
    group: 'Capabilities',
    type: 'checkbox',
    defaultValue: 'false',
  },
  {
    key: 'custom_fields',
    label: 'Create custom fields',
    group: 'Capabilities',
    type: 'checkbox',
    defaultValue: 'false',
  },
  {
    key: 'priority_scheduling',
    label: 'Priority scheduling',
    group: 'Capabilities',
    type: 'checkbox',
    helperText:
      'Lets a project on this plan turn on priority scheduling for its sync jobs.',
    defaultValue: 'false',
  },
  {
    key: 'env_migration',
    label: 'Environment migration',
    group: 'Capabilities',
    type: 'checkbox',
    defaultValue: 'false',
  },
  {
    key: 'job_dependency_chains',
    label: 'Job dependency chains',
    group: 'Capabilities',
    type: 'checkbox',
    helperText:
      'Lets a job on this plan wait on a parent job instead of running on its own cron.',
    defaultValue: 'false',
  },
  {
    key: 'historical_backfill',
    label: 'Historical backfill (one-time)',
    group: 'Capabilities',
    type: 'radio',
    options: [
      { value: 'addon', label: 'Paid add-on' },
      { value: 'included', label: 'Included' },
    ],
    defaultValue: 'addon',
  },

  // ── Trial ───────────────────────────────────────────────────────────────────
  {
    key: 'trial_enabled',
    label: 'Trial enabled',
    group: 'Trial',
    type: 'checkbox',
    defaultValue: 'false',
  },
  {
    key: 'trial_days',
    label: 'Trial length (days)',
    group: 'Trial',
    type: 'number',
    defaultValue: '14',
  },

  // ── Display (marketing copy, not enforced server-side) ─────────────────────
  {
    key: 'queue_priority',
    label: 'Queue priority',
    group: 'Display',
    type: 'radio',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'high', label: 'High' },
      { value: 'highest', label: 'Highest' },
    ],
    defaultValue: 'standard',
  },
  {
    key: 'support_level',
    label: 'Support level',
    group: 'Display',
    type: 'radio',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'priority', label: 'Priority' },
      { value: 'dedicated', label: 'Dedicated' },
      { value: 'dedicated_sla', label: 'Dedicated + SLA' },
    ],
    defaultValue: 'email',
  },
];

/** Seed values for a brand-new plan's feature form. */
export function defaultFeatureValues(): Record<string, string> {
  return Object.fromEntries(
    PLAN_FEATURE_FIELDS.map((f) => [f.key, f.defaultValue]),
  );
}

export const toMultiList = (value: string | undefined): string[] =>
  value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

export const fromMultiList = (list: string[]): string => list.join(',');

/**
 * Derives `scheduling_modes` from the cadences picked in the merged Sync Schedule control —
 * 15min/hourly need interval-based scheduling, daily needs a fixed daily time, and custom
 * unlocks every scheduling shape (it's the hand-built schedule editor). Real time needs no
 * scheduling-mode entry of its own (it's continuous, not built from a schedule shape).
 */
export function deriveSchedulingModes(frequencies: string[]): string {
  if (frequencies.includes('custom')) {
    return fromMultiList(SCHEDULING_MODE_OPTIONS.map((o) => o.value));
  }
  const modes = new Set<string>();
  if (frequencies.includes('15min') || frequencies.includes('hourly')) {
    modes.add('interval');
  }
  if (frequencies.includes('daily')) modes.add('daily_time');
  return fromMultiList(Array.from(modes));
}

/** Derives `objects_synced` from the two ObjectsScopeField toggles. Core is always included. */
export function deriveObjectsSynced(
  includeExtended: boolean,
  includeCustom: boolean,
): string {
  if (includeExtended && includeCustom) return 'all_custom';
  if (includeCustom) return 'core_custom';
  if (includeExtended) return 'core_extended';
  return 'core';
}

/** Reverse of deriveObjectsSynced — seeds ObjectsScopeField's two toggles from a stored value. */
export function parseObjectsSynced(value: string): {
  includeExtended: boolean;
  includeCustom: boolean;
} {
  return {
    includeExtended: value === 'core_extended' || value === 'all_custom',
    includeCustom: value === 'core_custom' || value === 'all_custom',
  };
}
