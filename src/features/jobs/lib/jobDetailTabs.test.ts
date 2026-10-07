import { describe, expect, it } from 'vitest';

import { DEFAULT_TAB_ID, TAB_DEFS } from './jobDetailTabs';

describe('job detail tabs', () => {
  it('uses Overview as the first and default tab', () => {
    expect(DEFAULT_TAB_ID).toBe('overview');
    expect(TAB_DEFS[0]).toMatchObject({
      id: 'overview',
      label: 'Overview',
    });
  });

  it('includes schedule as a top-level tab', () => {
    expect(TAB_DEFS.map((tab) => String(tab.id))).toContain('schedule');
  });

  it('labels run-history as Sync History', () => {
    const historyTab = TAB_DEFS.find((tab) => tab.id === 'run-history');
    expect(historyTab?.label).toBe('Sync History');
  });

  it('maintains the expected tab sequence', () => {
    const tabIds = TAB_DEFS.map((tab) => tab.id);
    expect(tabIds).toEqual([
      'overview',
      'field-mapping',
      'pipeline',
      'schedule',
      'run-history',
      'conflicts',
      'webhook-events',
      'settings',
    ]);
  });
});
