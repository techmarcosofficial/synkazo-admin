import * as React from 'react';

import {
  headingSubtitleStyles,
  headingTitleStyles,
  type HeadingVisualLevel,
} from '@/components/shared/headingStyles';
import { cn } from '@/lib/utils';

type CardSurface = 'auto' | 'outer' | 'inner' | 'inset';

const CardNestingContext = React.createContext(false);
const CardHeadingContext = React.createContext<HeadingVisualLevel>('card');

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
          'group/card text-card-foreground flex flex-col gap-(--card-spacing) overflow-hidden border py-(--card-spacing) text-sm shadow-none [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)]',
          resolvedSurface === 'inset'
            ? 'bg-muted/30 border-border/70 rounded-2xl *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl'
            : resolvedSurface === 'inner'
              ? 'bg-secondary/40 border-border/70 rounded-3xl *:[img:first-child]:rounded-t-3xl *:[img:last-child]:rounded-b-3xl'
              : 'bg-card border-border rounded-4xl *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CardNestingContext.Provider>
  );
}

function CardHeader({
  className,
  visualLevel = 'card',
  ...props
}: React.ComponentProps<'div'> & { visualLevel?: HeadingVisualLevel }) {
  return (
    <CardHeadingContext.Provider value={visualLevel}>
      <div
        data-slot="card-header"
        className={cn(
          'group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
          className,
        )}
        {...props}
      />
    </CardHeadingContext.Provider>
  );
}

function CardTitle({
  className,
  visualLevel,
  ...props
}: React.ComponentProps<'div'> & { visualLevel?: HeadingVisualLevel }) {
  const inheritedLevel = React.useContext(CardHeadingContext);
  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-heading text-foreground',
        headingTitleStyles[visualLevel ?? inheritedLevel],
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  visualLevel,
  ...props
}: React.ComponentProps<'div'> & { visualLevel?: HeadingVisualLevel }) {
  const inheritedLevel = React.useContext(CardHeadingContext);
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-muted-foreground',
        headingSubtitleStyles[visualLevel ?? inheritedLevel],
        className,
      )}
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
        'flex items-center px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
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
