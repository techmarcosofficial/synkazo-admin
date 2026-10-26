'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import {
  formControlSizes,
  formControlSurface,
} from '@/components/ui/form-control-styles';
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react';

type SelectSize = 'sm' | 'default';

const SelectContext = React.createContext<{
  size: SelectSize;
  setSize: React.Dispatch<React.SetStateAction<SelectSize>>;
}>({
  size: 'default',
  setSize: () => {},
});

function Select({
  size: controlledSize,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root> & {
  size?: SelectSize;
}) {
  const [size, setSize] = React.useState<SelectSize>(controlledSize ?? 'default');

  React.useEffect(() => {
    if (controlledSize && controlledSize !== size) {
      setSize(controlledSize);
    }
  }, [controlledSize, size]);

  return (
    <SelectContext.Provider value={{ size, setSize }}>
      <SelectPrimitive.Root data-slot="select" {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  );
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  const { size: contextSize, setSize } = React.useContext(SelectContext);
  const isSmall =
    size === 'sm' ||
    (!size && className && /\b(h-[678](\.5)?|text-xs)\b/.test(className));
  const resolvedSize = size ?? (isSmall ? 'sm' : contextSize);

  React.useEffect(() => {
    if (resolvedSize !== contextSize) {
      setSize(resolvedSize);
    }
  }, [resolvedSize, contextSize, setSize]);

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={resolvedSize}
      className={cn(
        formControlSurface,
        formControlSizes[resolvedSize],
        "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex w-fit items-center justify-between gap-1.5 py-2 text-base whitespace-nowrap focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 md:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === 'item-aligned'}
        className={cn(
          'bg-popover text-popover-foreground ring-foreground/5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-border data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl shadow-lg ring-1 duration-100 data-[align-trigger=true]:animate-none',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            'data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)',
            position === 'popper' && '',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-3 py-1.5 text-xs font-medium', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  size?: SelectSize;
}) {
  const { size: contextSize } = React.useContext(SelectContext);
  const resolvedSize = size ?? contextSize;

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-size={resolvedSize}
      className={cn(
        "focus:bg-accent/40 focus:text-foreground hover:bg-accent/40 hover:text-foreground data-highlighted:bg-accent/40 data-highlighted:text-foreground dark:focus:bg-white/12 dark:focus:text-white dark:hover:bg-white/12 dark:hover:text-white dark:data-highlighted:bg-white/12 dark:data-highlighted:text-white not-data-[variant=destructive]:focus:**:text-foreground data-highlighted:**:text-foreground dark:data-highlighted:**:text-white relative flex w-full cursor-default items-center rounded-lg font-medium outline-hidden select-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        resolvedSize === 'sm'
          ? "py-1.5 pl-2.5 pr-7 text-xs gap-2 min-h-7.5 [&_svg:not([class*='size-'])]:size-3.5"
          : "py-1.5 pl-3 pr-8 text-sm gap-2.5 min-h-8.5 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none absolute flex items-center justify-center",
          resolvedSize === 'sm' ? "right-1.5 size-3.5" : "right-2 size-4",
        )}
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className={cn("pointer-events-none", resolvedSize === 'sm' ? "size-3.5" : "size-4")} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        'bg-border pointer-events-none -mx-1 my-1 h-px',
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
