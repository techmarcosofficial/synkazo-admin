import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useSectionTabs } from './useSectionTabs';

import { roleIndex } from '@/lib/permissions';
import { BILLING_SECTION, ORGANIZATION_SECTION } from '@/lib/sectionTabs';
import type { UserRole } from '@/types';

const mockRole = vi.hoisted(() => ({ current: 'editor' as UserRole }));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: (minRole: UserRole) =>
      roleIndex(mockRole.current) >= roleIndex(minRole),
  }),
}));

/**
 * The authorization core behind all three section layouts (Settings' strip,
 * Organization's detail header, Billing's rail). Testing it here rather than
 * through one layout keeps the guarantee attached to the rule itself.
 */
function at(path: string, role: UserRole, section = ORGANIZATION_SECTION) {
  mockRole.current = role;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(() => useSectionTabs(section), { wrapper }).result.current;
}

describe('visible tabs', () => {
  it('gives an editor only the tabs they can reach', () => {
    expect(at('/organization/general', 'editor').tabs.map((t) => t.id)).toEqual(
      ['general', 'members'],
    );
  });

  it('gives an org admin every tab', () => {
    expect(
      at('/organization/general', 'org_admin').tabs.map((t) => t.id),
    ).toEqual(['general', 'members', 'invitations', 'billing']);
  });
});

describe('direct-URL protection', () => {
  it('refuses to resolve a tab an editor cannot see', () => {
    const state = at('/organization/billing/invoices', 'editor');

    // No active tab means the layout renders a redirect instead of content.
    expect(state.active).toBeNull();
    expect(state.access).toBeNull();
    // Inside the section they asked for, not a bare bounce to the dashboard.
    expect(state.fallbackPath).toBe('/organization/general');
  });

  it('resolves the same URL for an org admin', () => {
    const state = at('/organization/billing/invoices', 'org_admin');

    expect(state.active?.id).toBe('billing');
  });

  it('reads only this level’s segment, leaving deeper ones to the nested section', () => {
    expect(
      at('/organization/billing/payment-history', 'org_admin').active?.id,
    ).toBe('billing');
    expect(
      at('/organization/billing/payment-history', 'org_admin', BILLING_SECTION)
        .active?.id,
    ).toBe('payment-history');
  });

  it('does not resolve an unknown segment', () => {
    const state = at('/organization/nonsense', 'org_admin');

    expect(state.active).toBeNull();
    expect(state.fallbackPath).toBe('/organization/general');
  });
});

describe('view vs edit', () => {
  it('marks General read-only for an editor, with a reason', () => {
    const state = at('/organization/general', 'editor');

    expect(state.access?.canEdit).toBe(false);
    expect(state.access?.readOnlyNote).toMatch(/organization admins/i);
  });

  it('lets an org admin edit, with no note', () => {
    const state = at('/organization/general', 'org_admin');

    expect(state.access?.canEdit).toBe(true);
    expect(state.access?.readOnlyNote).toBe('');
  });
});
