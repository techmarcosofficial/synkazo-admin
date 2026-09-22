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

  it('moves scheduling out of the top-level tabs', () => {
    expect(TAB_DEFS.map((tab) => String(tab.id))).not.toContain('schedule');
  });
});
