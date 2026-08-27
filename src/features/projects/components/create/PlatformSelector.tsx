// features/projects/components/PlatformSelector.tsx

import { PlatformIcon } from '@/components/platform';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { PlatformId } from '@/types/connection';

export interface PlatformListItem {
  platformId: PlatformId;
  label: string;
}

interface PlatformSelectorProps {
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

  registerItemRef?: (
    platformId: PlatformId,
    element: HTMLDivElement | null,
  ) => void;
}

export default function PlatformSelector({
  label,
  description,
  value,
  onChange,
  platforms,
  disabled = false,
  centerItems = false,
  registerItemRef,
}: PlatformSelectorProps) {
  const groupPrefix = label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className={cn('space-y-3', centerItems && 'flex h-full flex-col')}>
      <div>
        <Label className="font-semibold" required>
          {label}
        </Label>

        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
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
          'flex flex-col gap-2',
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
                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all',
                selected
                  ? 'border-primary bg-primary/5 ring-primary/10 ring-2'
                  : 'hover:border-primary/40 hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <PlatformIcon platformId={platform.platformId} size={32} />

              <Label
                htmlFor={inputId}
                className="flex-1 cursor-pointer font-medium"
              >
                {platform.label}
              </Label>

              {/* Card's own onClick above owns selection; keep this
                  purely visual/keyboard-accessible so a click never has to
                  race the label's native "for" activation forwarding. */}
              <RadioGroupItem
                value={platform.platformId}
                id={inputId}
                className="pointer-events-none"
              />
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
