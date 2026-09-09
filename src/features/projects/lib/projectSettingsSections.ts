export type ProjectSettingsSectionId =
  'general' | 'schedule' | 'associations' | 'environments';

export interface ProjectSettingsSectionRequirements {
  connections: boolean;
  jobs: boolean;
}

export interface ProjectSettingsSectionDef {
  id: ProjectSettingsSectionId;
  label: string;
  description: string;
  requires?: ProjectSettingsSectionRequirements;
}

export const DEFAULT_PROJECT_SETTINGS_SECTION: ProjectSettingsSectionId =
  'general';

export const PROJECT_SETTINGS_SECTION_DEFS: ProjectSettingsSectionDef[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Project identity and fixed integration context.',
  },
  {
    id: 'schedule',
    label: 'Schedule & Execution',
    description: 'Control when jobs run and how work is ordered.',
    requires: { connections: true, jobs: true },
  },
  {
    id: 'associations',
    label: 'Associations',
    description: 'Create and monitor relationships between synced records.',
    requires: { connections: true, jobs: true },
  },
  {
    id: 'environments',
    label: 'Environments',
    description: 'Choose where syncs run and transfer configuration safely.',
    requires: { connections: true, jobs: true },
  },
];

export const LEGACY_PROJECT_TAB_SECTIONS = {
  scheduler: 'schedule',
  associations: 'associations',
  'environment-sync': 'environments',
} as const satisfies Record<string, ProjectSettingsSectionId>;

export function isProjectSettingsSectionId(
  value: string | null,
): value is ProjectSettingsSectionId {
  return PROJECT_SETTINGS_SECTION_DEFS.some((section) => section.id === value);
}

export function resolveProjectSettingsSection(
  value: string | null,
): ProjectSettingsSectionId {
  return isProjectSettingsSectionId(value)
    ? value
    : DEFAULT_PROJECT_SETTINGS_SECTION;
}

export function legacyProjectSettingsSectionForTab(
  value: string | null,
): ProjectSettingsSectionId | null {
  if (!value || !(value in LEGACY_PROJECT_TAB_SECTIONS)) return null;
  return LEGACY_PROJECT_TAB_SECTIONS[
    value as keyof typeof LEGACY_PROJECT_TAB_SECTIONS
  ];
}

export function isProjectSettingsSectionLocked(
  section: ProjectSettingsSectionDef,
  hasBothConnections: boolean,
  hasJobs: boolean,
): boolean {
  if (!section.requires) return false;
  if (section.requires.connections && !hasBothConnections) return true;
  return section.requires.jobs && !hasJobs;
}

export function projectSettingsSectionLockReason(
  section: ProjectSettingsSectionDef,
  hasBothConnections: boolean,
  hasJobs: boolean,
): string {
  if (!section.requires) return '';
  if (!hasBothConnections) {
    return 'Add and verify source and destination connections first.';
  }
  if (section.requires.jobs && !hasJobs) {
    return 'Create at least one sync job first.';
  }
  return '';
}

export function buildProjectSettingsSearchParams(
  current: URLSearchParams,
  section: ProjectSettingsSectionId,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set('tab', 'settings');
  next.set('section', section);
  return next;
}
