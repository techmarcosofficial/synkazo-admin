import type { ReactNode } from 'react';

import {
  headingSubtitleStyles,
  headingTitleStyles,
  type HeadingVisualLevel,
} from '@/components/shared/headingStyles';
import { cn } from '@/lib/utils';

/** Text pair for an interactive row whose button cannot contain headings. */
export default function TextPair({
  title,
  subtitle,
  visualLevel = 'item',
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  visualLevel?: HeadingVisualLevel;
  className?: string;
}) {
  return (
    <span className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className={cn('text-foreground', headingTitleStyles[visualLevel])}>
        {title}
      </span>
      {subtitle && (
        <span
          className={cn(
            'text-muted-foreground',
            headingSubtitleStyles[visualLevel],
          )}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}
