import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { JobDetailTabView } from '@/features/jobs/hooks';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  return (
    <TabsList>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
