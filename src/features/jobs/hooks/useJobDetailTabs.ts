import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  DEFAULT_TAB_ID,
  LEGACY_SETTINGS_SECTION_TABS,
  TAB_DEFS,
  type JobDetailTabContext,
  type JobDetailTabId,
} from '@/features/jobs/lib/jobDetailTabs';

export interface JobDetailTabView {
  id: JobDetailTabId;
  label: string;
}

// Tab is the URL's source of truth (`?tab=...`) so it's bookmarkable/shareable
// — replacing the page's old per-job localStorage "last tab" memory, and
// matching useProjectDetailTabs's URL-driven approach.
export function useJobDetailTabs(ctx: JobDetailTabContext) {
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleDefs = TAB_DEFS.filter(
    (tab) => !tab.visible || tab.visible(ctx),
  );

  const rawRequestedTab = searchParams.get('tab');
  const legacySection = rawRequestedTab
    ? LEGACY_SETTINGS_SECTION_TABS[rawRequestedTab]
    : undefined;
  const normalizedRequestedTab = legacySection
    ? 'settings'
    : (rawRequestedTab as JobDetailTabId | null);
  const activeTab = visibleDefs.some((t) => t.id === normalizedRequestedTab)
    ? (normalizedRequestedTab as JobDetailTabId)
    : DEFAULT_TAB_ID;

  const tabs: JobDetailTabView[] = visibleDefs.map((tab) => ({
    id: tab.id,
    label: tab.label,
  }));

  // Old history/conflicts/webhook tab links (e.g. ?tab=webhook-events&runId=…)
  // open the matching Settings section, keeping their other params.
  useEffect(() => {
    if (!legacySection) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'settings');
    next.set('section', legacySection);
    setSearchParams(next, { replace: true });
  }, [legacySection, searchParams, setSearchParams]);

  // Automatically migrate legacy ?tab=schedule or ?tab=settings&section=schedule links to Overview tab with modal auto-open.
  useEffect(() => {
    if (
      rawRequestedTab === 'schedule' ||
      (rawRequestedTab === 'settings' &&
        searchParams.get('section') === 'schedule')
    ) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'overview');
      next.set('openSchedule', 'true');
      next.delete('section');
      setSearchParams(next, { replace: true });
    }
  }, [rawRequestedTab, searchParams, setSearchParams]);

  const handleTabChange = (
    id: JobDetailTabId,
    options?: {
      replace?: boolean;
      searchParams?: Record<string, string | undefined | null>;
    },
  ) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    if (options?.searchParams) {
      Object.entries(options.searchParams).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      });
    }
    setSearchParams(next, { replace: options?.replace });
  };

  return { activeTab, tabs, handleTabChange };
}
