import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TAB_ID,
  LEGACY_SETTINGS_SECTION_TABS,
  TAB_DEFS,
} from './jobDetailTabs';

describe('job detail tabs', () => {
  it('uses Overview as the first and default tab', () => {
    expect(DEFAULT_TAB_ID).toBe('overview');
    expect(TAB_DEFS[0]).toMatchObject({
      id: 'overview',
      label: 'Overview',
    });
  });

  it('sends old history, conflict and webhook tab links to Settings sections', () => {
    expect(LEGACY_SETTINGS_SECTION_TABS).toEqual({
      'run-history': 'sync-history',
      'sync-history': 'sync-history',
      conflicts: 'conflicts',
      'webhook-events': 'webhook-events',
    });
  });

  it('maintains the expected tab sequence', () => {
    const tabIds = TAB_DEFS.map((tab) => tab.id);
    expect(tabIds).toEqual([
      'overview',
      'field-mapping',
      'run-sync',
      'settings',
      'pipeline',
    ]);
  });
});
