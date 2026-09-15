import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import type { SectionAccessValue } from '@/lib/sectionAccess';
import {
  canEditTab,
  defaultTabPath,
  readOnlyReasonFor,
  visibleTabs,
  type SectionDef,
  type SectionTabDef,
} from '@/lib/sectionTabs';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';

export interface SectionTabsState {
  /** Only the tabs this role may reach. */
  tabs: SectionTabDef[];
  /** The tab for the current URL, or null when it must redirect. */
  active: SectionTabDef | null;
  /** Where to send the viewer when `active` is null. */
  fallbackPath: string;
  /** View-vs-edit for the active tab, for SectionAccessProvider. */
  access: SectionAccessValue | null;
}

/**
 * Resolves which tabs a section shows and which one the URL is on.
 *
 * The authorization core lives here rather than in a component so the three
 * section layouts — Settings' simple strip, Organization's detail header, and
 * Billing's nested sub-navigation — can look completely different while sharing
 * one rule. `active` is looked up in the *already role-filtered* list, so
 * "absent from the navigation" and "blocked on a direct URL" remain the same
 * expression no matter how a layout chooses to draw it.
 */
export function useSectionTabs(
  section: SectionDef,
  deniedMessage?: string,
): SectionTabsState {
  const { hasRole } = useSynkazoAuth();
  const { pathname } = useLocation();
  const warned = useRef(false);

  const tabs = visibleTabs(section.tabs, hasRole);

  // The segment straight after basePath is this level's tab; anything deeper
  // belongs to a nested section (e.g. /organization/billing/invoices).
  const rest = pathname.slice(section.basePath.length).replace(/^\//, '');
  const segment = rest.split('/')[0] ?? '';
  const active = tabs.find((tab) => tab.id === segment) ?? null;

  const denied = !active && Boolean(segment);

  useEffect(() => {
    if (!denied || warned.current) return;
    warned.current = true;
    if (deniedMessage) showToast.info(deniedMessage);
  }, [denied, deniedMessage]);

  return {
    tabs,
    active,
    fallbackPath: defaultTabPath(section, hasRole),
    access: active
      ? {
          tab: active,
          canEdit: canEditTab(active, hasRole),
          readOnlyNote: readOnlyReasonFor(active, hasRole),
        }
      : null,
  };
}
