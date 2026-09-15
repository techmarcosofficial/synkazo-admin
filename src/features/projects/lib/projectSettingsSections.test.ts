import { describe, expect, it } from 'vitest';

import {
  buildProjectSettingsSearchParams,
  isProjectSettingsSectionLocked,
  legacyProjectSettingsSectionForTab,
  PROJECT_SETTINGS_SECTION_DEFS,
  projectSettingsSectionLockReason,
  resolveProjectSettingsSection,
} from './projectSettingsSections';

describe('project settings section definitions', () => {
  it('keeps the approved section order', () => {
    expect(PROJECT_SETTINGS_SECTION_DEFS.map((section) => section.id)).toEqual([
      'general',
      'schedule',
      'associations',
      'environments',
    ]);
  });

  it('maps legacy project tabs to their new Settings destinations', () => {
    expect(legacyProjectSettingsSectionForTab('scheduler')).toBe('schedule');
    expect(legacyProjectSettingsSectionForTab('associations')).toBe(
      'associations',
    );
    expect(legacyProjectSettingsSectionForTab('environment-sync')).toBe(
      'environments',
    );
    expect(legacyProjectSettingsSectionForTab('overview')).toBeNull();
  });

  it('falls back to General for missing or invalid sections', () => {
    expect(resolveProjectSettingsSection(null)).toBe('general');
    expect(resolveProjectSettingsSection('unknown')).toBe('general');
    expect(resolveProjectSettingsSection('schedule')).toBe('schedule');
  });

  it('preserves unrelated parameters while building a section URL', () => {
    const current = new URLSearchParams(
      'tab=activity&checkout=success&redirect=%2Fprojects',
    );
    const next = buildProjectSettingsSearchParams(current, 'associations');

    expect(next.get('tab')).toBe('settings');
    expect(next.get('section')).toBe('associations');
    expect(next.get('checkout')).toBe('success');
    expect(next.get('redirect')).toBe('/projects');
  });
});

describe('project settings prerequisites', () => {
  const schedule = PROJECT_SETTINGS_SECTION_DEFS.find(
    (section) => section.id === 'schedule',
  )!;

  it('keeps General available without project prerequisites', () => {
    expect(
      isProjectSettingsSectionLocked(
        PROJECT_SETTINGS_SECTION_DEFS[0],
        false,
        false,
      ),
    ).toBe(false);
  });

  it('explains missing connections before missing jobs', () => {
    expect(isProjectSettingsSectionLocked(schedule, false, false)).toBe(true);
    expect(projectSettingsSectionLockReason(schedule, false, false)).toMatch(
      /source and destination connections/i,
    );
  });

  it('explains the job prerequisite after connections are ready', () => {
    expect(isProjectSettingsSectionLocked(schedule, true, false)).toBe(true);
    expect(projectSettingsSectionLockReason(schedule, true, false)).toMatch(
      /sync job/i,
    );
    expect(isProjectSettingsSectionLocked(schedule, true, true)).toBe(false);
  });
});
