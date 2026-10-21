import { useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeftRight, ArrowRight, ChevronDown, Clock } from 'lucide-react';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SyncFlowCardProps {
  name: string;
  subtitle: ReactNode;
  twoWay: boolean;
  scheduleText: string;
  status: string;
  titleLink: ReactNode;
  action: ReactNode;
  details: ReactNode;
  hasMetrics?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Shared flow card frame. Each route owns its queries, links and actions. */
export default function SyncFlowCard({
  name,
  subtitle,
  twoWay,
  scheduleText,
  status,
  titleLink,
  action,
  details,
  hasMetrics = false,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: SyncFlowCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const DirectionIcon = twoWay ? ArrowLeftRight : ArrowRight;

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    setOpen(!open);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card surface="inner" className="gap-0 py-0 transition-colors">
        <div
          className="hover:bg-muted/30 flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors sm:px-5 lg:flex-row lg:items-center"
          onClick={handleRowClick}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors">
              <DirectionIcon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              {titleLink}
              <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end lg:flex-nowrap">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs whitespace-nowrap">
              <Clock className="size-3.5" aria-hidden="true" />
              {scheduleText}
            </span>
            <StatusBadge status={status} size="sm" />
            <Separator
              orientation="vertical"
              className="h-6 data-vertical:self-center"
            />
            {action}
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                shape="pill"
                aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
              >
                <ChevronDown
                  className={cn('size-4 transition-transform', open && 'rotate-180')}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div
            className={cn(
              'border-t',
              hasMetrics ? 'bg-muted space-y-2 px-1.5 py-2' : 'bg-muted/30 px-4 py-2',
            )}
          >
            {details}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
