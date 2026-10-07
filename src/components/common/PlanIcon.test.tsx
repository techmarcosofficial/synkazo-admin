import { describe, expect, it } from 'vitest';

import { resolvePlanIconKey } from './PlanIcon';

describe('resolvePlanIconKey', () => {
  it('uses an explicit icon for a custom plan regardless of its name', () => {
    expect(resolvePlanIconKey('growth', 'Enterprise Plus')).toBe('growth');
  });

  it('provides legacy defaults for existing named plans', () => {
    expect(resolvePlanIconKey(undefined, 'Starter')).toBe('starter');
    expect(resolvePlanIconKey(undefined, 'Pro Plus')).toBe('pro');
    expect(resolvePlanIconKey(undefined, 'Enterprise')).toBe('enterprise');
  });

  it('falls back safely for a new name or an unsupported saved key', () => {
    expect(resolvePlanIconKey(undefined, 'Scale')).toBe('general');
    expect(resolvePlanIconKey('old-custom-icon', 'Pro')).toBe('general');
  });
});
