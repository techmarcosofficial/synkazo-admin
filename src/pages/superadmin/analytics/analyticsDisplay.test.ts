import { describe, expect, it } from 'vitest';
import {
  chartMoney,
  defaultRange,
  moneyLabel,
  runHoursPerHundred,
  validRange,
} from './analyticsDisplay';

describe('Analytics display boundaries', () => {
  it('computes workload ratios only with positive same-currency collections and complete duration', () => {
    expect(runHoursPerHundred(180000000, 0, '10000', 'USD')).toBe('50');
    expect(runHoursPerHundred(180000000, 1, '10000', 'USD')).toBe('—');
    expect(runHoursPerHundred(180000000, 0, '0', 'USD')).toBe('—');
    expect(runHoursPerHundred(180000000, 0, null, 'USD')).toBe('—');
  });
  it('formats exact minor units including zero- and three-decimal currencies', () => {
    expect(moneyLabel('11800', 'USD')).toContain('118.00');
    expect(moneyLabel('11800', 'JPY')).not.toContain('118.00');
    expect(moneyLabel('11800', 'JPY')).toContain('11,800');
    expect(moneyLabel('11800', 'KWD')).toContain('11.800');
    expect(moneyLabel('-1', 'USD')).toContain('-$0.01');
    expect(moneyLabel(null, 'USD')).toBe('—');
    expect(moneyLabel('0', 'USD')).toContain('0.00');
  });

  it('never silently loses aggregate money precision for a chart or table', () => {
    expect(moneyLabel('900719925474099301', 'USD')).toContain(
      '9,007,199,254,740,993.01',
    );
    expect(chartMoney('900719925474099301', 'USD')).toBeNull();
    expect(chartMoney('11800', 'USD')).toBe(118);
    expect(chartMoney(null, 'USD')).toBeNull();
  });

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
