import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface JobTabView {
  id: string;
  label: string;
  hasUnsavedDraft?: boolean;
}

export default function JobTabBar({ tabs }: { tabs: JobTabView[] }) {
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
            {tab.hasUnsavedDraft && (
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
