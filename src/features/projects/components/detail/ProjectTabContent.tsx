import { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { TAB_DEFS } from '@/features/projects/lib/projectDetailTabs';

const TAB_COMPONENTS = {
  overview: lazy(() => import('./tabs/OverviewTab')),
  connections: lazy(() => import('./tabs/ConnectionsTab')),
  'sync-rules': lazy(() => import('./tabs/SyncRulesTab')),
  scheduler: lazy(() => import('./tabs/SchedulerTab')),
  associations: lazy(() => import('./tabs/AssociationsTab')),
  'environment-sync': lazy(() => import('./tabs/EnvironmentSyncTab')),
  activity: lazy(() => import('./tabs/ActivityTab')),
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

export default function ProjectTabContent() {
  return (
    <>
      {TAB_DEFS.map((tab) => {
        const TabComponent = TAB_COMPONENTS[tab.id];
        return (
          <TabsContent key={tab.id} value={tab.id}>
            <Suspense fallback={<TabSkeleton />}>
              <TabComponent />
            </Suspense>
          </TabsContent>
        );
      })}
    </>
  );
}
