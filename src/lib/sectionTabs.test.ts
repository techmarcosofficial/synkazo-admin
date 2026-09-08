import { describe, expect, it } from 'vitest';

import { ROLE_HIERARCHY, roleIndex } from './permissions';
import {
  BILLING_SECTION,
  canEditTab,
  defaultTabPath,
  ORGANIZATION_SECTION,
  readOnlyReasonFor,
  SETTINGS_SECTION,
  sectionMinRole,
  visibleTabs,
} from './sectionTabs';

import type { UserRole } from '@/types';

/** Mirrors hasRole in synkazoAuth — rank comparison, not equality. */
const as = (role: UserRole) => (minRole: UserRole) =>
  roleIndex(role) >= roleIndex(minRole);

const editor = as('editor');
const orgAdmin = as('org_admin');
const superAdmin = as('super_admin');

const ids = (role: UserRole) =>
  visibleTabs(ORGANIZATION_SECTION.tabs, as(role)).map((t) => t.id);

describe('section tab visibility', () => {
  it('hides Invitations and Billing from an editor', () => {
    expect(ids('editor')).toEqual(['general', 'members']);
  });

  it('shows every organization tab to org_admin and super_admin', () => {
    const all = ['general', 'members', 'invitations', 'billing'];
    expect(ids('org_admin')).toEqual(all);
    expect(ids('super_admin')).toEqual(all);
  });

  it('shows all settings tabs to every role — settings is personal', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(visibleTabs(SETTINGS_SECTION.tabs, as(role))).toHaveLength(3);
    }
  });
});

describe('view vs edit', () => {
  const general = ORGANIZATION_SECTION.tabs[0];
  const members = ORGANIZATION_SECTION.tabs[1];

  it('lets an editor view General and Members but not edit them', () => {
    for (const tab of [general, members]) {
      expect(canEditTab(tab, editor)).toBe(false);
      expect(readOnlyReasonFor(tab, editor)).not.toBe('');
    }
  });

  it('lets org_admin edit, with no read-only note', () => {
    expect(canEditTab(general, orgAdmin)).toBe(true);
    expect(readOnlyReasonFor(general, orgAdmin)).toBe('');
  });

  it('treats a tab with no editRole as editable by anyone who can see it', () => {
    expect(canEditTab(SETTINGS_SECTION.tabs[0], editor)).toBe(true);
  });
});

describe('default landing tab', () => {
  it('sends every role to the first tab it can actually see', () => {
    expect(defaultTabPath(ORGANIZATION_SECTION, editor)).toBe(
      '/organization/general',
    );
    expect(defaultTabPath(SETTINGS_SECTION, editor)).toBe(
      '/settings/preferences',
    );
  });

  it('falls back to the dashboard when no tab is permitted', () => {
    // Billing's tabs are reachable only via its org_admin-gated parent, so a
    // section whose every tab is hidden must not loop on itself.
    expect(defaultTabPath({ ...BILLING_SECTION, tabs: [] }, editor)).toBe(
      '/dashboard',
    );
  });
});

describe('sectionMinRole', () => {
  it('is editor for Organization — General is reachable by everyone', () => {
    expect(sectionMinRole(ORGANIZATION_SECTION)).toBe('editor');
  });

  it('is editor for Settings', () => {
    expect(sectionMinRole(SETTINGS_SECTION)).toBe('editor');
  });

  it('rises to the lowest reachable tab when every tab is gated', () => {
    expect(
      sectionMinRole({
        basePath: '/x',
        title: '',
        description: '',
        tabs: [
          { id: 'a', label: 'A', minRole: 'super_admin' },
          { id: 'b', label: 'B', minRole: 'org_admin' },
        ],
      }),
    ).toBe('org_admin');
  });
});

describe('billing section', () => {
  it('derives its tabs from the Organization billing tab, not a second list', () => {
    expect(BILLING_SECTION.tabs.map((t) => t.id)).toEqual([
      'overview',
      'subscription',
      'payment-methods',
      'invoices',
      'payment-history',
    ]);
  });

  it('is visible to org_admin and above', () => {
    expect(visibleTabs(BILLING_SECTION.tabs, orgAdmin)).toHaveLength(5);
    expect(visibleTabs(BILLING_SECTION.tabs, superAdmin)).toHaveLength(5);
  });
});
