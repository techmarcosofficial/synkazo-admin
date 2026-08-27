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
    <TabsList variant={'line'}>
      {tabs.map((tab) => {
        const trigger = (
          <TabsTrigger
            className="after:bg-primary"
            value={tab.id}
            disabled={tab.locked}
          >
            {tab.label}
            {tab.locked ? (
              <Lock />
            ) : tab.badge != null ? (
              <span className="bg-muted text-muted-foreground flex h-4.5 w-4.5 items-center justify-center rounded-full text-xs font-semibold">
                {tab.badge}
              </span>
            ) : null}
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
