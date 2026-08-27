import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { JobDetailTabView } from '@/features/jobs/hooks';

export default function JobTabs({ tabs }: { tabs: JobDetailTabView[] }) {
  return (
    <TabsList variant={'line'}>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id} className="after:bg-primary">
          {tab.label}
          {tab.badge != null && (
            <span className="bg-muted text-muted-foreground flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] font-semibold">
              {tab.badge}
            </span>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
