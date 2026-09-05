// features/projects/components/PlatformSelector.tsx

import { CircleHelp } from 'lucide-react';

import { PlatformIcon } from '@/components/platform';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PlatformId } from '@/types/connection';

export interface PlatformListItem {
  platformId: PlatformId;
  label: string;
}

interface PlatformSelectorProps {
  className?: string;

  label: string;
  description?: string;

  value: PlatformId | '';

  onChange: (value: PlatformId) => void;

  platforms: PlatformListItem[];

  disabled?: boolean;

  // When set, the radio cards are vertically centered in the space below
  // the label/description instead of stacking from the top — used when this
  // side is restricted to a fixed subset (e.g. HubSpot-only destination) so
  // a single card doesn't look stranded against a taller sibling column.
  centerItems?: boolean;

  cardClassName?: string;

  registerItemRef?: (
    platformId: PlatformId,
    element: HTMLDivElement | null,
  ) => void;
}

export default function PlatformSelector({
  className,
  label,
  description,
  value,
  onChange,
  platforms,
  disabled = false,
  centerItems = false,
  cardClassName,
  registerItemRef,
}: PlatformSelectorProps) {
  const groupPrefix = label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div
      className={cn(
        'space-y-2',
        centerItems && 'flex h-full flex-col',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Label className="font-semibold" required>
          {label}
        </Label>

        {description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full"
                aria-label={`About ${label}`}
              >
                <CircleHelp className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* `value` is always driven by the caller's state (never `defaultValue`),
          so switching platforms re-renders every item's selected/indicator
          state on every change, not just the first one. */}
      <RadioGroup
        value={value}
        onValueChange={(v) => {
          if (disabled) return;
          onChange(v as PlatformId);
        }}
        className={cn(
          'flex w-full gap-2',
          centerItems && 'flex-1 justify-center',
        )}
        disabled={disabled}
      >
        {platforms.map((platform) => {
          const selected = value === platform.platformId;
          const inputId = `${groupPrefix}-${platform.platformId}`;

          return (
            <div
              key={platform.platformId}
              ref={(el) => registerItemRef?.(platform.platformId, el)}
              onClick={(e) => {
                // Radix's RadioGroupItem keeps a hidden native <input> in sync via a
                // synthetic, bubbling "click" event dispatched on every checked-state
                // change (both the item gaining AND losing selection) — see
                // RadioBubbleInput in @radix-ui/react-radio-group. That event bubbles
                // up into this div, so without the isTrusted guard, deselecting an
                // item re-fires this handler and immediately re-selects it, making
                // selection appear to only move "forward" and never back.
                if (!e.isTrusted) return;
                if (!disabled) onChange(platform.platformId);
              }}
              className={cn(
                'border-muted-foreground/40 relative flex h-24 w-full min-w-30 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition-all',
                selected
                  ? 'border-primary bg-primary/5 ring-primary/10 border-solid ring-2'
                  : 'hover:border-primary/40 hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-60',
                cardClassName,
              )}
            >
              <PlatformIcon platformId={platform.platformId} size={32} />

              <Label htmlFor={inputId} className="cursor-pointer font-medium">
                {platform.label}
              </Label>

              {/* Card's own onClick above owns selection; keep this
                  purely visual/keyboard-accessible so a click never has to
                  race the label's native "for" activation forwarding. */}
              <RadioGroupItem
                value={platform.platformId}
                id={inputId}
                className="pointer-events-none absolute top-3 right-3"
              />
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
