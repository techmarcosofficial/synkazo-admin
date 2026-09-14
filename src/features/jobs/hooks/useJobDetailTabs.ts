import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  DEFAULT_TAB_ID,
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
  const requestedTab =
    rawRequestedTab === 'overview'
      ? DEFAULT_TAB_ID
      : (rawRequestedTab as JobDetailTabId | null);
  const activeTab = visibleDefs.some((t) => t.id === requestedTab)
    ? (requestedTab as JobDetailTabId)
    : DEFAULT_TAB_ID;

  const tabs: JobDetailTabView[] = visibleDefs.map((tab) => ({
    id: tab.id,
    label: tab.label,
  }));

  // Overview now lives in the expandable card on the project's Sync Jobs tab.
  // Keep existing bookmarks useful by replacing the retired tab in-place.
  useEffect(() => {
    if (rawRequestedTab !== 'overview') return;

    const next = new URLSearchParams(searchParams);
    next.set('tab', DEFAULT_TAB_ID);
    setSearchParams(next, { replace: true });
  }, [rawRequestedTab, searchParams, setSearchParams]);

  const handleTabChange = (
    id: JobDetailTabId,
    options?: { replace?: boolean },
  ) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: options?.replace });
  };

  return { activeTab, tabs, handleTabChange };
}
