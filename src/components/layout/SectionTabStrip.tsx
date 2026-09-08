import { useNavigate } from 'react-router-dom';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SectionTabDef } from '@/lib/sectionTabs';
import { cn } from '@/lib/utils';

/**
 * The route-driven tab strip shared by the section workspaces, using the same
 * line treatment and thick primary underline as the Project and Sync Job detail
 * pages (see features/projects ProjectTabs).
 *
 * Presentational only: `value` comes from the resolved route, `onValueChange`
 * navigates. There is no TabsContent — content arrives through the router.
 */
export default function SectionTabStrip({
  tabs,
  activeId,
  basePath,
  className,
}: {
  tabs: SectionTabDef[];
  activeId: string;
  basePath: string;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <Tabs
      value={activeId}
      onValueChange={(id) => navigate(`${basePath}/${id}`)}
      className={cn('gap-0', className)}
    >
      {/* Scrolls horizontally on narrow screens rather than wrapping. */}
      <div className="overflow-x-auto">
        <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              data-tour={`${tab.id}-tab`}
              className="after:bg-primary rounded-full py-2 font-semibold after:-bottom-0.5! after:h-1!"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
