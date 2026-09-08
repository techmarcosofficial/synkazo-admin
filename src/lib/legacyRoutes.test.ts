import { describe, expect, it } from 'vitest';

import { resolveLegacyLocation } from './legacyRoutes';

const resolve = (url: string) => {
  const [pathname, search = ''] = url.split('?');
  return resolveLegacyLocation(pathname, search ? `?${search}` : '');
};

describe('legacy settings URLs', () => {
  it('forwards the personal tabs', () => {
    expect(resolve('/profile')).toBe('/settings/profile');
    expect(resolve('/settings?section=profile')).toBe('/settings/profile');
    expect(resolve('/settings?section=settings')).toBe('/settings/preferences');
    expect(resolve('/settings?section=security')).toBe('/settings/security');
  });

  it('returns null for bare /settings so the caller applies its own fallback', () => {
    expect(resolve('/settings')).toBeNull();
  });

  it('falls back to preferences for an unknown section', () => {
    expect(resolve('/settings?section=nonsense')).toBe('/settings/preferences');
  });
});

describe('legacy billing URLs', () => {
  it('moves billing out of Settings and into Organization', () => {
    expect(resolve('/settings?section=billing')).toBe(
      '/organization/billing/overview',
    );
    expect(resolve('/settings/billing')).toBe('/organization/billing/overview');
  });

  it('maps every old tab key, including the two that were renamed or merged', () => {
    const at = (tab: string) => resolve(`/settings?section=billing&tab=${tab}`);
    expect(at('subscription')).toBe('/organization/billing/subscription');
    expect(at('invoices')).toBe('/organization/billing/invoices');
    // Renamed for the URL.
    expect(at('payment')).toBe('/organization/billing/payment-methods');
    // The standalone History tab was folded into Payment History.
    expect(at('history')).toBe('/organization/billing/payment-history');
    expect(at('payment-history')).toBe('/organization/billing/payment-history');
  });

  it('falls back to overview for an unknown tab', () => {
    expect(resolve('/settings?section=billing&tab=nope')).toBe(
      '/organization/billing/overview',
    );
  });
});

describe('preserved query params', () => {
  it('carries the Stripe checkout handshake through the move', () => {
    expect(
      resolve(
        '/settings?section=billing&checkout=success&first_checkout=true&redirect=%2Fprojects',
      ),
    ).toBe(
      '/organization/billing/overview?checkout=success&first_checkout=true&redirect=%2Fprojects',
    );
  });

  it('drops section and tab — the path expresses them now', () => {
    const result = resolve('/settings?section=billing&tab=invoices');
    expect(result).toBe('/organization/billing/invoices');
    expect(result).not.toContain('section=');
    expect(result).not.toContain('tab=');
  });

  it('keeps preserved params on the personal tabs too', () => {
    expect(resolve('/profile?redirect=%2Fjobs')).toBe(
      '/settings/profile?redirect=%2Fjobs',
    );
  });
});

describe('legacy organization URLs', () => {
  it('folds Invitations and Team into the Organization workspace', () => {
    expect(resolve('/invitations')).toBe('/organization/invitations');
    expect(resolve('/team')).toBe('/organization/general');
  });
});

describe('unmapped paths', () => {
  it('returns null so the route table handles them normally', () => {
    expect(resolve('/dashboard')).toBeNull();
    expect(resolve('/projects/abc')).toBeNull();
  });
});
