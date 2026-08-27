import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

function PageToolbarLeft({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {children}
    </div>
  );
}

function PageToolbarRight({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {children}
    </div>
  );
}

function PageToolbarRoot({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const PageToolbar = Object.assign(PageToolbarRoot, {
  Left: PageToolbarLeft,
  Right: PageToolbarRight,
});
