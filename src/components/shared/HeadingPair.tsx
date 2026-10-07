import { useContext, type ReactNode } from 'react';

import { TenantAdminVisualContext } from '@/components/shared/TenantAdminVisualContext';
import {
  headingSubtitleStyles,
  headingTitleStyles,
  type HeadingVisualLevel,
} from '@/components/shared/headingStyles';
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
}: HeadingPairProps) {
  const isTenantPage = useContext(TenantAdminVisualContext);
  const resolvedVisualLevel =
    visualLevel ?? (isTenantPage && Heading === 'h1' ? 'page' : 'section');

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
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
        {trailing}
      </div>
      {subtitle && (
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
