import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  DEFAULT_TAB_ID,
  TAB_DEFS,
  isTabLocked,
  lockReasonFor,
  type ProjectDetailTabId,
} from '@/features/projects/lib/projectDetailTabs';
import {
  buildProjectSettingsSearchParams,
  DEFAULT_PROJECT_SETTINGS_SECTION,
  legacyProjectSettingsSectionForTab,
  type ProjectSettingsSectionId,
} from '@/features/projects/lib/projectSettingsSections';

export interface ProjectDetailTabView {
  id: ProjectDetailTabId;
  label: string;
  locked: boolean;
  lockReason: string;
}

interface UseProjectDetailTabsInput {
  loading: boolean;
  hasBothConnections: boolean;
  hasJobs: boolean;
}

export interface ProjectDetailTabChangeOptions {
  replace?: boolean;
  section?: ProjectSettingsSectionId;
}

// Tab is the URL's source of truth (`?tab=...`) so it's bookmarkable/shareable
// — replacing the page's old per-project localStorage "last tab" memory.
export function useProjectDetailTabs(input: UseProjectDetailTabsInput) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab');
  const legacySection = legacyProjectSettingsSectionForTab(requestedTab);
  const activeTab: ProjectDetailTabId = legacySection
    ? 'settings'
    : TAB_DEFS.some((t) => t.id === requestedTab)
      ? (requestedTab as ProjectDetailTabId)
      : DEFAULT_TAB_ID;

  const tabs: ProjectDetailTabView[] = TAB_DEFS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    locked: isTabLocked(tab, input.hasBothConnections, input.hasJobs),
    lockReason: lockReasonFor(tab, input.hasBothConnections, input.hasJobs),
  }));

  const handleTabChange = (
    id: ProjectDetailTabId,
    options?: ProjectDetailTabChangeOptions,
  ) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'settings') {
      const section = options?.section ?? DEFAULT_PROJECT_SETTINGS_SECTION;
      const settingsParams = buildProjectSettingsSearchParams(next, section);
      setSearchParams(settingsParams, { replace: options?.replace });
      return;
    }
    next.set('tab', id);
    next.delete('section');
    setSearchParams(next, { replace: options?.replace });
  };

  // Old bookmarked project tabs now resolve to their equivalent Settings
  // section without adding a stale history entry. All unrelated query params
  // survive the canonicalization.
  useEffect(() => {
    if (!legacySection) return;
    setSearchParams(
      buildProjectSettingsSearchParams(searchParams, legacySection),
      { replace: true },
    );
  }, [legacySection, searchParams, setSearchParams]);

  // If data changes (or the URL points at an unlocked-then-locked tab) land
  // us on a locked tab, bounce back to Overview rather than showing it.
  useEffect(() => {
    if (input.loading) return;
    if (legacySection) return;
    const current = tabs.find((t) => t.id === activeTab);
    if (current?.locked) handleTabChange(DEFAULT_TAB_ID, { replace: true });
  }, [
    input.loading,
    activeTab,
    input.hasBothConnections,
    input.hasJobs,
    legacySection,
  ]);

  return { activeTab, tabs, handleTabChange };
}
