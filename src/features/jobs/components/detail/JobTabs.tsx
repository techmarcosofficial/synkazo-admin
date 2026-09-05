import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { JobDetailTabView } from '@/features/jobs/hooks';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  return (
    <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className="after:bg-primary py-2 font-semibold after:bottom-0! after:h-1!"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
