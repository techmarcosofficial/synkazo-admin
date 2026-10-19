import { describe, expect, it } from 'vitest';
import { defaultRange, validRange } from './analyticsDisplay';

describe('Analytics display boundaries', () => {
  it('uses calendar UTC ranges including today with an exclusive end', () => {
    expect(defaultRange(7, new Date('2026-03-01T23:30:00-08:00'))).toEqual({
      from: '2026-02-24',
      to: '2026-03-03',
    });
    expect(
      validRange({ ...defaultRange(), currency: 'USD', granularity: 'day' }),
    ).toBe(true);
    expect(
      validRange({
        from: '2024-01-01',
        to: '2026-01-01',
        currency: 'USD',
        granularity: 'day',
      }),
    ).toBe(false);
  });
});
