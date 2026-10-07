import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobDetailContext } from '@/features/jobs/components/detail/context';
import type { JobDetailTabView } from '@/features/jobs/hooks';
import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  const { job } = useJobDetailContext();
  const hasMappingDraft = useFieldMappingDraftStore((state) =>
    job?.id ? state.hasDraft(job.id) : false,
  );

  return (
    <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className="after:bg-primary py-2 font-semibold after:bottom-0! after:h-1!"
        >
          <span className="flex items-center gap-1.5">
            {tab.label}
            {tab.id === 'field-mapping' && hasMappingDraft && (
              <span
                className="bg-warning size-1.5 rounded-full"
                title="Has unsaved draft"
              />
            )}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
