import { describe, expect, it } from 'vitest';

import { findSuperAdminNavItem, SUPER_ADMIN_NAV } from './superAdminNav';

describe('SUPER_ADMIN_NAV', () => {
  it('exposes at least one platform group with an overview entry', () => {
    const platform = SUPER_ADMIN_NAV.find((g) => g.label === 'Platform');
    expect(platform).toBeDefined();
    expect(platform?.items[0]?.url).toBe('/super-admin/overview');
  });

  it('scopes every entry to super_admin so the shared NavMain filter blocks lower roles', () => {
    const roles = SUPER_ADMIN_NAV.flatMap((g) =>
      g.items.map((i) => i.minRole),
    );
    expect(new Set(roles)).toEqual(new Set(['super_admin']));
  });

  it('has no url outside the /super-admin/ tree', () => {
    const urls = SUPER_ADMIN_NAV.flatMap((g) => g.items.map((i) => i.url));
    expect(urls.every((u) => u.startsWith('/super-admin/'))).toBe(true);
  });
});

describe('findSuperAdminNavItem', () => {
  it('matches an exact url', () => {
    expect(findSuperAdminNavItem('/super-admin/organisations')?.item.title).toBe(
      'Organisations',
    );
  });

  it('matches a nested url within a top-level nav destination', () => {
    expect(
      findSuperAdminNavItem('/super-admin/organisations/abc-123/overview')
        ?.item.title,
    ).toBe('Organisations');
  });

  it('returns null for a route outside the workspace', () => {
    expect(findSuperAdminNavItem('/dashboard')).toBeNull();
  });

  it('returns null for the workspace root (index route redirects to overview)', () => {
    expect(findSuperAdminNavItem('/super-admin')).toBeNull();
  });
});
