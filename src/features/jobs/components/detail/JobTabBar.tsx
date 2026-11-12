import {
  Columns2,
  GitBranch,
  LayoutDashboard,
  Lock,
  Play,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  'field-mapping': Columns2,
  'run-sync': Play,
  settings: Settings,
  pipeline: GitBranch,
};

export interface JobTabView {
  id: string;
  label: string;
  hasUnsavedDraft?: boolean;
  locked?: boolean;
  lockReason?: string;
}

export default function JobTabBar({ tabs }: { tabs: JobTabView[] }) {
  return (
    <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        const trigger = (
          <TabsTrigger
            value={tab.id}
            disabled={tab.locked}
            data-guide={`tab-${tab.id}`}
            className="after:bg-primary py-2 font-semibold after:bottom-0! after:h-1! disabled:opacity-70"
          >
            <span className="flex items-center gap-1.5">
              {Icon && <Icon aria-hidden="true" className="size-4" />}
              {tab.label}
              {tab.hasUnsavedDraft && (
                <span
                  className="bg-warning size-1.5 rounded-full"
                  title="Has unsaved draft"
                />
              )}
              {tab.locked && <Lock aria-hidden="true" />}
            </span>
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
