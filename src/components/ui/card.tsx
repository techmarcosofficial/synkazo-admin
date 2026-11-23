import * as React from 'react';

import InfoTip from '@/components/shared/InfoTip';
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
          'group/card text-card-foreground flex flex-col gap-(--card-spacing) overflow-hidden border py-(--card-spacing) text-sm [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)]',
          resolvedSurface === 'inset'
            ? 'bg-surface-inset border-border/70 dark:border-border/70 rounded-2xl *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl'
            : resolvedSurface === 'inner'
              ? 'border-border/70 dark:border-border/70 rounded-3xl *:[img:first-child]:rounded-t-3xl *:[img:last-child]:rounded-b-3xl'
              : 'bg-card border-border/80 dark:border-border/80 rounded-4xl *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CardNestingContext.Provider>
  );
}

/** Flattens one level of fragments so `<>{title}{description}</>` still works. */
function flattenHeaderChildren(children: React.ReactNode): React.ReactNode[] {
  const flat: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      React.Children.forEach(
        (child.props as { children?: React.ReactNode }).children,
        (nested) => flat.push(nested),
      );
      return;
    }
    flat.push(child);
  });
  return flat;
}

/**
 * Swaps the `CardTitle` for a title + `InfoTip` row, wherever it sits — titles
 * are often wrapped in a flex row alongside a badge.
 */
function attachHintToTitle(
  node: React.ReactNode,
  hint: React.ReactNode,
  state: { done: boolean },
): React.ReactNode {
  if (state.done || !React.isValidElement(node)) return node;

  if (node.type === CardTitle) {
    state.done = true;
    return (
      <div className="flex min-w-0 items-center gap-2">
        {node}
        <InfoTip>{hint}</InfoTip>
      </div>
    );
  }

  const { children } = node.props as { children?: React.ReactNode };
  if (children == null || typeof children !== 'object') return node;

  const mapped = React.Children.map(children, (child) =>
    attachHintToTitle(child, hint, state),
  );
  return state.done ? React.cloneElement(node, undefined, mapped) : node;
}

/**
 * Headers show the title alone; a `CardDescription` sibling is lifted into an
 * `InfoTip` beside it so cards stay compact. Pass `inlineDescription` to keep
 * the description as a visible line instead.
 */
function collapseDescriptionIntoTitle(children: React.ReactNode) {
  const flat = flattenHeaderChildren(children);

  const descriptions = flat.filter(
    (child) => React.isValidElement(child) && child.type === CardDescription,
  ) as React.ReactElement<{ children?: React.ReactNode }>[];

  // Without a description there is nothing to merge; render as authored.
  if (descriptions.length === 0) return children;

  const hint = descriptions.map((description, index) => (
    <React.Fragment key={index}>{description.props.children}</React.Fragment>
  ));

  const state = { done: false };
  const rest = flat
    .filter((child) => !descriptions.includes(child as never))
    .map((child) => attachHintToTitle(child, hint, state));

  // No title to hang the hint on — keep the description visible.
  return state.done ? rest : children;
}

function CardHeader({
  className,
  visualLevel = 'card',
  inlineDescription = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  visualLevel?: HeadingVisualLevel;
  inlineDescription?: boolean;
}) {
  return (
    <CardHeadingContext.Provider value={visualLevel}>
      <div
        data-slot="card-header"
        className={cn(
          'group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
          className,
        )}
        {...props}
      >
        {inlineDescription ? children : collapseDescriptionIntoTitle(children)}
      </div>
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
