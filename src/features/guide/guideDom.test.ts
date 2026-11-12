import { describe, expect, it } from 'vitest';

import { CARD_GAP, placeCard } from './guideDom';

describe('placeCard', () => {
  it('sits beside an open dialog instead of covering it', () => {
    Object.assign(window, { innerWidth: 1600, innerHeight: 900 });
    const dialog = { top: 100, left: 400, width: 700, height: 700 };
    const button = { top: 760, left: 950, width: 130, height: 36 };
    const placed = placeCard(button, 150, 'top', dialog);
    expect(placed.side).toBe('right');
    expect(placed.left).toBe(dialog.left + dialog.width + CARD_GAP);
  });

  it('falls back to normal placement when there is no room beside it', () => {
    Object.assign(window, { innerWidth: 900, innerHeight: 900 });
    const dialog = { top: 50, left: 20, width: 860, height: 800 };
    const button = { top: 400, left: 300, width: 120, height: 36 };
    expect(placeCard(button, 150, 'bottom', dialog).side).toBe('bottom');
  });
});
