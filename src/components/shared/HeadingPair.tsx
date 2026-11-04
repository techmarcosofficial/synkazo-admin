import { Info } from 'lucide-react';
import { useContext, type ReactNode } from 'react';

import { TenantAdminVisualContext } from '@/components/shared/TenantAdminVisualContext';
import {
  headingSubtitleStyles,
  headingTitleStyles,
  type HeadingVisualLevel,
} from '@/components/shared/headingStyles';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeadingPairProps {
  title: ReactNode;
  subtitle?: ReactNode;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
  visualLevel?: HeadingVisualLevel;
  trailing?: ReactNode;
  titleId?: string;
  tone?: 'default' | 'danger';
  className?: string;
  subtitleInTooltip?: boolean;
  subtitleAsTooltip?: boolean;
}

/** The title and supporting line used by admin pages and sections. */
export default function HeadingPair({
  title,
  subtitle,
  level: Heading = 'h2',
  visualLevel,
  trailing,
  titleId,
  tone = 'default',
  className,
  subtitleInTooltip,
  subtitleAsTooltip,
}: HeadingPairProps) {
  const isTenantPage = useContext(TenantAdminVisualContext);
  const resolvedVisualLevel =
    visualLevel ?? (isTenantPage && Heading === 'h1' ? 'page' : 'section');
  const showSubtitleInTooltip = Boolean(subtitleInTooltip || subtitleAsTooltip);

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        !showSubtitleInTooltip && 'gap-1',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Heading
          id={titleId}
          className={cn(
            'min-w-0',
            headingTitleStyles[resolvedVisualLevel],
            tone === 'danger' ? 'text-destructive' : 'text-foreground',
          )}
        >
          {title}
        </Heading>
        {showSubtitleInTooltip && subtitle && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="More information"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs font-normal">
                {subtitle}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {trailing}
      </div>
      {!showSubtitleInTooltip && subtitle && (
        <p
          className={cn(
            'text-muted-foreground',
            headingSubtitleStyles[resolvedVisualLevel],
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
