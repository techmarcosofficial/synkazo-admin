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
  badge: number | null;
}

// Tab is the URL's source of truth (`?tab=...`) so it's bookmarkable/shareable
// — replacing the page's old per-job localStorage "last tab" memory, and
// matching useProjectDetailTabs's URL-driven approach.
export function useJobDetailTabs(ctx: JobDetailTabContext) {
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleDefs = TAB_DEFS.filter(
    (tab) => !tab.visible || tab.visible(ctx),
  );

  const requestedTab = searchParams.get('tab') as JobDetailTabId | null;
  const activeTab = visibleDefs.some((t) => t.id === requestedTab)
    ? (requestedTab as JobDetailTabId)
    : DEFAULT_TAB_ID;

  const tabs: JobDetailTabView[] = visibleDefs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    badge: tab.badge ? tab.badge(ctx) : null,
  }));

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
