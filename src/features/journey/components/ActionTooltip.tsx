import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ActionTooltipProps {
  children: ReactNode;
  tooltip?: string | ReactNode;
  disabled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export default function ActionTooltip({
  children,
  tooltip,
  disabled = false,
  side = 'top',
}: ActionTooltipProps) {
  if (!tooltip || !disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed items-center">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs font-normal">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
