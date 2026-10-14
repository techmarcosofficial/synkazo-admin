import JobTabBar from './JobTabBar';

import { useJobDetailContext } from '@/features/jobs/components/detail/context';
import type { JobDetailTabView } from '@/features/jobs/hooks';
import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  const { job } = useJobDetailContext();
  const hasMappingDraft = useFieldMappingDraftStore((state) =>
    job?.id ? state.hasDraft(job.id) : false,
  );

  return (
    <JobTabBar
      tabs={tabs.map((tab) => ({
        ...tab,
        hasUnsavedDraft: tab.id === 'field-mapping' && hasMappingDraft,
      }))}
    />
  );
}
