import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import type {
  ConnectionExt,
  JobExt,
  ProjectActivityLog,
} from './useProjectDetail';

import type { AssociationRule } from '@/api/associations';
import {
  DEFAULT_TAB_ID,
  TAB_DEFS,
  isTabLocked,
  lockReasonFor,
  type ProjectDetailTabId,
} from '@/features/projects/lib/projectDetailTabs';

export interface ProjectDetailTabView {
  id: ProjectDetailTabId;
  label: string;
  locked: boolean;
  lockReason: string;
  badge: number | null;
}

interface UseProjectDetailTabsInput {
  loading: boolean;
  hasBothConnections: boolean;
  hasJobs: boolean;
  jobs: JobExt[];
  connections: ConnectionExt[];
  associationRules: AssociationRule[];
  logs: ProjectActivityLog[];
}

// Tab is the URL's source of truth (`?tab=...`) so it's bookmarkable/shareable
// — replacing the page's old per-project localStorage "last tab" memory.
export function useProjectDetailTabs(input: UseProjectDetailTabsInput) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab') as ProjectDetailTabId | null;
  const activeTab = TAB_DEFS.some((t) => t.id === requestedTab)
    ? (requestedTab as ProjectDetailTabId)
    : DEFAULT_TAB_ID;

  const tabs: ProjectDetailTabView[] = TAB_DEFS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    locked: isTabLocked(tab, input.hasBothConnections, input.hasJobs),
    lockReason: lockReasonFor(tab, input.hasBothConnections, input.hasJobs),
    badge: tab.badge
      ? tab.badge({
          jobs: input.jobs,
          connections: input.connections,
          associationRules: input.associationRules,
          logs: input.logs,
        })
      : null,
  }));

  const handleTabChange = (
    id: ProjectDetailTabId,
    options?: { replace?: boolean },
  ) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: options?.replace });
  };

  // If data changes (or the URL points at an unlocked-then-locked tab) land
  // us on a locked tab, bounce back to Overview rather than showing it.
  useEffect(() => {
    if (input.loading) return;
    const current = tabs.find((t) => t.id === activeTab);
    if (current?.locked) handleTabChange(DEFAULT_TAB_ID, { replace: true });
  }, [input.loading, activeTab, input.hasBothConnections, input.hasJobs]);

  return { activeTab, tabs, handleTabChange };
}
