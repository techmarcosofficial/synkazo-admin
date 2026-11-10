import {
  LayoutDashboard,
  Lock,
  Plug,
  Settings,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';

const TAB_ICONS: Record<ProjectDetailTabId, LucideIcon> = {
  overview: LayoutDashboard,
  connections: Plug,
  'sync-rules': Workflow,
  settings: Settings,
};

export interface ProjectTabView {
  id: string;
  label: string;
  locked?: boolean;
  lockReason?: string;
}

export default function ProjectTabs({
  tabs,
}: {
  tabs: readonly ProjectTabView[];
}) {
  return (
    <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id as ProjectDetailTabId];
        const trigger = (
          <TabsTrigger
            value={tab.id}
            disabled={tab.locked}
            className="py-2 disabled:opacity-70"
          >
            {Icon && <Icon aria-hidden="true" />}
            {tab.label}
            {tab.locked && <Lock />}
          </TabsTrigger>
        );

        if (!tab.locked) {
          return (
            <span key={tab.id} className="contents">
              {trigger}
            </span>
          );
        }

        return (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <span className="inline-flex">{trigger}</span>
            </TooltipTrigger>
            <TooltipContent>{tab.lockReason}</TooltipContent>
          </Tooltip>
        );
      })}
    </TabsList>
  );
}
