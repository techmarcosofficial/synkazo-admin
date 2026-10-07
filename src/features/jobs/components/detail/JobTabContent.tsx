import { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';

const TAB_COMPONENTS = {
  overview: lazy(() => import('./tabs/OverviewTab')),
  'field-mapping': lazy(() => import('./tabs/FieldMappingTab')),
  pipeline: lazy(() => import('./tabs/PipelineTab')),
  schedule: lazy(() => import('./tabs/ScheduleTab')),
  'run-history': lazy(() => import('./tabs/RunHistoryTab')),
  conflicts: lazy(() => import('./tabs/ConflictsTab')),
  'webhook-events': lazy(() => import('./tabs/WebhookEventsTab')),
  settings: lazy(() => import('./tabs/SettingsTab')),
} as const;

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Only the tabs actually visible (per useJobDetailTabs' `visible` filter) are
// mounted — e.g. Pipeline is omitted entirely, not just hidden, when the
// job's destination object doesn't require one.
export default function JobTabContent({
  visibleTabIds,
}: {
  visibleTabIds: (keyof typeof TAB_COMPONENTS)[];
}) {
  return (
    <>
      {visibleTabIds.map((id) => {
        const TabComponent = TAB_COMPONENTS[id];
        return (
          <TabsContent key={id} value={id}>
            <Suspense fallback={<TabSkeleton />}>
              <TabComponent />
            </Suspense>
          </TabsContent>
        );
      })}
    </>
  );
}
