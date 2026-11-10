import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// A small "i" that holds helper text, so long descriptions don't crowd a form.
// Click events stop here, so it can sit inside a clickable header or label.
export default function InfoTip({
  children,
  label = 'More information',
  side = 'top',
  className,
}: {
  children: ReactNode;
  label?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              'text-muted-foreground/70 hover:text-foreground focus-visible:ring-ring/50 inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full outline-none focus-visible:ring-2',
              className,
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-64 text-xs leading-snug font-normal"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
