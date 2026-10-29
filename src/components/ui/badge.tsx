import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

type BadgeTone = 'success' | 'warning' | 'info' | 'paused' | 'danger' | 'muted';

const BadgeAppearanceContext = React.createContext<'default' | 'tinted'>(
  'default',
);

function BadgeAppearanceProvider({ children }: { children: React.ReactNode }) {
  return (
    <BadgeAppearanceContext.Provider value="tinted">
      {children}
    </BadgeAppearanceContext.Provider>
  );
}

const useBadgeAppearance = () => React.useContext(BadgeAppearanceContext);

const badgeToneClasses: Record<BadgeTone, string> = {
  success:
    'bg-success/10 text-foreground hover:bg-success/15 dark:bg-success/10 dark:text-foreground dark:hover:bg-success/15',
  warning:
    'bg-warning/10 text-foreground hover:bg-warning/15 dark:bg-warning/10 dark:text-foreground dark:hover:bg-warning/15',
  info: 'bg-info/10 text-foreground hover:bg-info/15 dark:bg-info/10 dark:text-foreground dark:hover:bg-info/15',
  paused:
    'bg-paused/10 text-foreground hover:bg-paused/15 dark:bg-paused/10 dark:text-foreground dark:hover:bg-paused/15',
  danger:
    'bg-destructive/10 text-foreground hover:bg-destructive/15 dark:bg-destructive/10 dark:text-foreground dark:hover:bg-destructive/15',
  muted:
    'bg-muted-foreground/10 text-foreground hover:bg-muted-foreground/15 dark:bg-muted-foreground/10 dark:text-foreground dark:hover:bg-muted-foreground/15',
};

const badgeDotClasses: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  paused: 'bg-paused',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg:not([class*="size-"])]:size-3',
  {
    variants: {
      size: {
        xs: 'h-4.5 px-1.5 text-[11px]',
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-[13px]',
      },
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
  },
);

function Badge({
  className,
  size = 'sm',
  variant = 'default',
  asChild = false,
  tone,
  indicator,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    tone?: BadgeTone;
    indicator?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'span';
  const tinted = useBadgeAppearance() === 'tinted';
  const resolvedTone = tone ?? (variant === 'destructive' ? 'danger' : 'muted');
  const showDot = tinted && indicator !== false;

  const dot = showDot ? (
    <span
      data-slot="badge-dot"
      aria-hidden="true"
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        badgeDotClasses[resolvedTone],
      )}
    />
  ) : null;
  const content = asChild ? (
    showDot &&
    React.isValidElement<{ children?: React.ReactNode }>(children) ? (
      React.cloneElement(
        children,
        undefined,
        <>
          {dot}
          {children.props.children}
        </>,
      )
    ) : (
      children
    )
  ) : (
    <>
      {dot}
      {children}
    </>
  );

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      data-tone={tinted ? resolvedTone : undefined}
      data-appearance={tinted ? 'tinted' : undefined}
      className={cn(
        badgeVariants({ variant, size }),
        className,
        tinted && '[&_*]:text-foreground gap-1.5 border-0 shadow-none',
        tinted && badgeToneClasses[resolvedTone],
      )}
      {...props}
    >
      {content}
    </Comp>
  );
}

export {
  Badge,
  BadgeAppearanceProvider,
  badgeVariants,
  badgeToneClasses,
  useBadgeAppearance,
  type BadgeTone,
};
