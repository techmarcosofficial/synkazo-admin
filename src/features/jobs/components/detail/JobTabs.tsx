import { useEffect } from 'react';

import JobTabBar from './JobTabBar';

import { useJobDetailContext } from '@/features/jobs/components/detail/context';
import type { JobDetailTabView } from '@/features/jobs/hooks';
import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';
import { selectJobOnboardingState } from '@/features/onboarding';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  const {
    job,
    jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    activeTab,
    handleTabChange,
  } = useJobDetailContext();
  const hasMappingDraft = useFieldMappingDraftStore((state) =>
    job?.id ? state.hasDraft(job.id) : false,
  );

  const { mappingReady, configurationReady } = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const lockReasonFor = (id: string) => {
    if ((id === 'pipeline' || id === 'run-sync') && !mappingReady) {
      return 'Map your fields and choose a match field first';
    }
    if (id === 'run-sync' && !configurationReady) {
      return 'Choose the destination pipeline first';
    }
    return '';
  };

  // Run Sync and Pipeline unlock as setup progresses; Overview, Field Mapping
  // and Settings are never locked.
  const barTabs = tabs.map((tab) => {
    const lockReason = lockReasonFor(tab.id);
    return {
      ...tab,
      hasUnsavedDraft: tab.id === 'field-mapping' && hasMappingDraft,
      locked: Boolean(lockReason),
      lockReason,
    };
  });

  // A locked tab reached by URL falls back to Overview.
  const activeTabLocked = barTabs.some(
    (tab) => tab.id === activeTab && tab.locked,
  );
  useEffect(() => {
    if (activeTabLocked) handleTabChange('overview', { replace: true });
  }, [activeTabLocked]);

  return <JobTabBar tabs={barTabs} />;
}
