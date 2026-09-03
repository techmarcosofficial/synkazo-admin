import { Maximize2, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface BrowserMockupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Premium macOS-Safari-style glass window — matches the frosted-glass language of
 * the Use Cases recipe cards (thin translucent border, backdrop blur, soft purple
 * ambient glow) so the hero preview and that section read as one design system.
 */
export function BrowserMockup({
  title = 'app.synkazo.com',
  children,
  className,
}: BrowserMockupProps) {
  return (
    <div className={cn('bg-card rounded-[22px]', className)}>
      {/* Soft top-down sheen for glass depth. */}
      {/* <div
          className="from-foreground/[0.07] pointer-events-none absolute inset-0 rounded-[22px] bg-linear-to-b to-transparent"
          aria-hidden="true"
        /> */}

      <div className="bg-background relative flex items-center gap-4 rounded-t-[22px] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="bg-destructive/90 flex size-3.5 items-center justify-center rounded-full">
            <X className="size-2" />
          </span>
          <span className="bg-warning/90 flex size-3.5 items-center justify-center rounded-full">
            <Maximize2 className="size-2" />
          </span>
          <span className="bg-success/90 flex size-3.5 items-center justify-center rounded-full">
            <Minus className="size-2" />
          </span>
        </div>
        <div className="border-border/30 bg-card text-muted-foreground flex-1 rounded-full px-3 py-1 text-center text-xs">
          {title}
        </div>
      </div>

      <div className="relative p-5 sm:p-6">{children}</div>
    </div>
  );
}
