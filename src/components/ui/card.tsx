import * as React from 'react';

import { cn } from '@/lib/utils';

type CardSurface = 'auto' | 'outer' | 'inner';

const CardNestingContext = React.createContext(false);

function Card({
  className,
  size = 'default',
  surface = 'auto',
  children,
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  surface?: CardSurface;
}) {
  const isNested = React.useContext(CardNestingContext);
  const resolvedSurface =
    surface === 'auto' ? (isNested ? 'inner' : 'outer') : surface;

  return (
    <CardNestingContext.Provider value>
      <div
        data-slot="card"
        data-size={size}
        data-layout-surface={resolvedSurface}
        className={cn(
          'group/card bg-card text-card-foreground border-border flex flex-col gap-(--card-spacing) overflow-hidden rounded-4xl border py-(--card-spacing) text-sm shadow-none [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CardNestingContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-4xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-heading text-base font-medium', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
