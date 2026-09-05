import { Lock } from 'lucide-react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ProjectDetailTabView } from '@/features/projects/hooks';

export default function ProjectTabs({
  tabs,
}: {
  tabs: ProjectDetailTabView[];
}) {
  return (
    <TabsList variant="line" className="h-10 min-w-max overflow-hidden p-0">
      {tabs.map((tab) => {
        const trigger = (
          <TabsTrigger
            value={tab.id}
            disabled={tab.locked}
            className="after:bg-primary py-2 font-semibold after:bottom-0! after:h-1! disabled:opacity-70"
          >
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
