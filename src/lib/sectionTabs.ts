import { ROLE_HIERARCHY, roleIndex } from '@/lib/permissions';
import type { UserRole } from '@/types';

/**
 * Tab definitions for the routed section workspaces (Settings, Organization,
 * Organization → Billing).
 *
 * This module is the single source of truth for *who can reach what*. It drives
 * three consumers that previously restated the rule independently:
 *
 *   - `useSectionTabs` — resolves the active tab from the same filtered list the
 *     navigation is drawn from, so "hidden in the navigation" and "blocked on a
 *     direct URL" are the same expression and cannot drift apart. All three
 *     layouts (Settings, Organization, Billing) go through it.
 *   - `app-sidebar.tsx` — derives its nav `minRole` via `sectionMinRole()`
 *     instead of hardcoding it a second time.
 *   - `App.tsx` — declares paths only; it carries no role metadata for these
 *     sections at all.
 *
 * Modelled on `features/projects/lib/projectDetailTabs.ts` (TAB_DEFS plus pure
 * predicate helpers). The difference is the treatment of an unavailable tab:
 * project tabs are shown-but-locked because the user can unlock them by doing
 * something, whereas a role the user will never hold means the tab is omitted
 * entirely — the same choice `features/jobs/lib/jobDetailTabs.ts` documents.
 */
export interface SectionTabDef {
  /** URL segment under the section base path — also the Radix Tabs `value`. */
  id: string;
  label: string;
  /**
   * Completely inaccessible below this role: the tab is absent from the strip
   * and the route redirects away. Omit to mean "any authenticated role".
   */
  minRole?: UserRole;
  /**
   * Viewable but not editable below this role: the tab renders, but
   * `useSectionAccess().canEdit` is false so Save/Edit controls are not
   * rendered at all. Omit to mean "if you can see it, you can edit it".
   */
  editRole?: UserRole;
  /** Shown in place of the Save control when the viewer cannot edit. */
  readOnlyNote?: string;
  /** Nested tab strip rendered one level deeper (Billing). */
  children?: SectionTabDef[];
}

export interface SectionDef {
  basePath: string;
  title: string;
  description: string;
  tabs: SectionTabDef[];
}

export const SETTINGS_SECTION: SectionDef = {
  basePath: '/settings',
  title: 'Settings',
  description: 'Manage your personal account and application preferences.',
  tabs: [
    { id: 'preferences', label: 'Preferences' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
  ],
};

export const ORGANIZATION_SECTION: SectionDef = {
  basePath: '/organization',
  title: 'Organization',
  description:
    "Manage your organization's information, members, access, and subscription.",
  tabs: [
    {
      // No minRole: an editor may view the organisation they belong to. This is
      // a widening — /organization used to be org_admin-gated at the route.
      id: 'general',
      label: 'General',
      editRole: 'org_admin',
      readOnlyNote:
        'Only organization admins can update organization information.',
    },
    {
      id: 'members',
      label: 'Members',
      editRole: 'org_admin',
      readOnlyNote: 'Only organization admins can manage members.',
    },
    { id: 'invitations', label: 'Invitations', minRole: 'org_admin' },
    {
      id: 'billing',
      label: 'Billing & Usage',
      minRole: 'org_admin',
      children: [
        { id: 'overview', label: 'Overview' },
        { id: 'subscription', label: 'Subscription' },
        { id: 'payment-methods', label: 'Payment Methods' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'payment-history', label: 'Payment History' },
      ],
    },
  ],
};

const billingTab = ORGANIZATION_SECTION.tabs.find(
  (tab) => tab.id === 'billing',
);

/**
 * Billing's own section, driving the nested rail in `BillingLayout`. Title and
 * description are empty because Organization's header sits above it.
 */
export const BILLING_SECTION: SectionDef = {
  basePath: '/organization/billing',
  title: '',
  description: '',
  tabs: billingTab?.children ?? [],
};

type HasRole = (role: UserRole) => boolean;

/** Whether the tab appears at all. Mirrors `isTabLocked` in projectDetailTabs. */
function isTabVisible(tab: SectionTabDef, hasRole: HasRole): boolean {
  return !tab.minRole || hasRole(tab.minRole);
}

/** Whether the viewer may change anything on the tab. */
export function canEditTab(tab: SectionTabDef, hasRole: HasRole): boolean {
  const required = tab.editRole ?? tab.minRole;
  return !required || hasRole(required);
}

/** Copy for the read-only note. Empty when the viewer can edit. */
export function readOnlyReasonFor(
  tab: SectionTabDef,
  hasRole: HasRole,
): string {
  return canEditTab(tab, hasRole) ? '' : (tab.readOnlyNote ?? '');
}

export function visibleTabs(
  tabs: SectionTabDef[],
  hasRole: HasRole,
): SectionTabDef[] {
  return tabs.filter((tab) => isTabVisible(tab, hasRole));
}

/**
 * Where a section lands when no tab — or a tab this role cannot see — is
 * requested. Falls back to the dashboard only when the whole section is denied.
 */
export function defaultTabPath(section: SectionDef, hasRole: HasRole): string {
  const first = visibleTabs(section.tabs, hasRole)[0];
  return first ? `${section.basePath}/${first.id}` : '/dashboard';
}

/**
 * The sidebar entry's `minRole`: a section is reachable as soon as any one of
 * its tabs is. Derived rather than restated, so the nav and the routes cannot
 * disagree about who sees the section.
 */
export function sectionMinRole(section: SectionDef): UserRole {
  if (section.tabs.length === 0) return 'editor';
  const lowest = Math.min(
    ...section.tabs.map((tab) => roleIndex(tab.minRole ?? 'editor')),
  );
  return ROLE_HIERARCHY[lowest];
}
