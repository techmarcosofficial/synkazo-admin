import { describe, expect, it } from 'vitest';

import { computeGuideProgress } from './guideSteps';

const none = {
  connected: false,
  jobCreated: false,
  mapped: false,
  tested: false,
  scheduled: false,
};

describe('computeGuideProgress', () => {
  it('starts at Connect once the project exists', () => {
    const p = computeGuideProgress(none);
    expect(p.current).toBe('connect');
    expect(p.doneCount).toBe(1);
    expect(p.done.project).toBe(true);
  });

  it('walks forward as each step completes', () => {
    expect(
      computeGuideProgress({ ...none, connected: true, jobCreated: true })
        .current,
    ).toBe('map');
    expect(
      computeGuideProgress({
        connected: true,
        jobCreated: true,
        mapped: true,
        tested: true,
        scheduled: false,
      }).current,
    ).toBe('schedule');
  });

  it('never counts a later step while an earlier one is open', () => {
    // A connection broke after the test ran: Connect re-opens and nothing after it counts.
    const p = computeGuideProgress({
      connected: false,
      jobCreated: true,
      mapped: true,
      tested: true,
      scheduled: true,
    });
    expect(p.current).toBe('connect');
    expect(p.doneCount).toBe(1);
    expect(p.done.test).toBe(false);
  });

  it('reports done with no current step', () => {
    const p = computeGuideProgress({
      connected: true,
      jobCreated: true,
      mapped: true,
      tested: true,
      scheduled: true,
    });
    expect(p.current).toBeNull();
    expect(p.doneCount).toBe(6);
  });
});
