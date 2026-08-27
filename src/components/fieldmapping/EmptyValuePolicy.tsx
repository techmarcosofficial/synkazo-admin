import { AlertTriangle } from 'lucide-react';

import type { OnEmptyPolicy } from './FieldMappingCanvas';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface EmptyValuePolicyValue {
  onEmpty: OnEmptyPolicy;
  defaultValue: string;
}

export interface RequiredReason {
  platformLabel: string;
  /** The other platform in this job — used to spell out which sync direction a
   *  rule actually governs, so it's never ambiguous which leg is affected. */
  otherPlatformLabel?: string;
  fieldLabel: string;
  /** Enum options for the field this reason is about, when the platform publishes them. */
  options?: { value: string; label: string }[];
  /** The field's discovered type (e.g. 'number', 'boolean', 'date') — drives which
   *  value-input widget is shown and how it's validated. */
  fieldType?: string;
  /** 'write' — this platform is the forward leg's target, always written to.
   *  'writeback' — this platform is the source, and only requires the value because
   *  the sync writes back into it (the reverse leg of a two-way job). Phrased
   *  differently so it doesn't claim to be about an ordinary forward write. */
  context: 'write' | 'writeback';
}

const OPTIONS: Array<{
  value: Exclude<OnEmptyPolicy, 'none'>;
  label: string;
  hint: string;
}> = [
  {
    value: 'default',
    label: 'Use a default value',
    hint: 'Write this value instead whenever the source value is empty.',
  },
  {
    value: 'skip_record',
    label: 'Skip the record',
    hint: "Don't create or update the record at all. It's logged as skipped, not failed.",
  },
];

const NUMBER_TYPES = new Set(['number', 'integer', 'float', 'decimal']);
const BOOLEAN_TYPES = new Set(['boolean', 'bool', 'checkbox']);
const DATE_TYPES = new Set(['date', 'datetime', 'date_time']);

/**
 * Whether `value` is an acceptable default for a field of `fieldType`. Blank is
 * never valid here — emptiness is what this whole feature exists to prevent, so
 * an unfilled "default value" is exactly as unresolved as not picking a policy
 * at all. Covers the type vocabulary discovery actually produces today (see
 * mapHsType/inferType on the backend) — there's no 'email' field type anywhere
 * in current discovery output, so no email-specific check is added; string
 * types accept anything non-blank, same as before.
 */
export function isValidDefaultValue(
  fieldType: string | undefined,
  value: string,
): boolean {
  const v = value.trim();
  if (!v) return false;
  const t = (fieldType || '').toLowerCase();
  if (NUMBER_TYPES.has(t)) return Number.isFinite(Number(v));
  if (BOOLEAN_TYPES.has(t)) return v === 'true' || v === 'false';
  if (DATE_TYPES.has(t)) return !Number.isNaN(Date.parse(v));
  return true;
}

/**
 * Chooses what a mapping does when its value comes out empty.
 *
 * This exists because a required field with an empty value is the single most
 * common way a sync dies: the platform rejects the write with a 400, which the
 * executor classifies as permanent and never retries, and (on HubSpot's
 * all-or-nothing batch endpoints) takes the rest of the batch down with it. The
 * banner spells that out rather than presenting three neutral options — there
 * is no "leave it empty" choice, since that's the choice that breaks things,
 * and every place this renders already gates on the field being required.
 *
 * `reasons` can hold up to two entries — the destination platform (always the
 * forward leg's write target) and the source platform (only relevant when a
 * two-way job writes back into it) — because a mapping's two ends can each
 * independently require the value, on different platforms, for different
 * reasons. Each gets its own sentence so the banner never misattributes a
 * requirement to the wrong platform.
 *
 * Deliberately not plan-gated: an org that can't set this can't build a valid
 * two-way job at all.
 */
export default function EmptyValuePolicy({
  reasons,
  value,
  onChange,
  className,
  forceShowInvalid = false,
}: {
  reasons: RequiredReason[];
  value: EmptyValuePolicyValue;
  onChange: (next: EmptyValuePolicyValue) => void;
  className?: string;
  /** Turns the default-value input red even while it's still blank — normally
   *  a blank value stays unstyled so picking "Use a default value" doesn't
   *  immediately nag before the user has had a chance to type anything. The
   *  caller flips this to true once a save was actually attempted and blocked
   *  on this field, so leaving it blank has a visible consequence. */
  forceShowInvalid?: boolean;
}) {
  // Whichever side actually publishes an option list/type drives the default-value
  // picker — dest is tried first since requiredReasons() orders [dest, source].
  const options = reasons.find((r) => r.options?.length)?.options ?? [];
  const fieldType = reasons.find((r) => r.fieldType)?.fieldType;
  const fieldLabel =
    reasons.length === 1 ? reasons[0].fieldLabel : 'this field';
  const showInvalid =
    value.onEmpty === 'default' &&
    options.length === 0 &&
    !isValidDefaultValue(fieldType, value.defaultValue) &&
    (value.defaultValue.trim() !== '' || forceShowInvalid);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {reasons.length > 0 && (
        <div className="bg-warning/10 flex flex-col gap-1.5 rounded-lg px-3 py-2.5">
          {reasons.map((r) => (
            <div
              key={`${r.context}-${r.platformLabel}-${r.fieldLabel}`}
              className="flex items-start gap-2.5"
            >
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <p className="text-warning text-xs">
                {r.context === 'write' ? (
                  <>
                    <strong>{r.platformLabel}</strong> requires{' '}
                    <strong>{r.fieldLabel}</strong>. This applies whenever a
                    record is created or updated in {r.platformLabel}
                    {r.otherPlatformLabel
                      ? ` — from ${r.otherPlatformLabel} or any other source`
                      : ''}
                    . If it's empty at that point, the write is rejected and the
                    sync fails.
                  </>
                ) : (
                  <>
                    <strong>{r.platformLabel}</strong> requires{' '}
                    <strong>{r.fieldLabel}</strong> on its side too. This only
                    applies when this sync writes back into{' '}
                    <strong>{r.platformLabel}</strong>
                    {r.otherPlatformLabel
                      ? ` — it does not affect syncing records from ${r.platformLabel} to ${r.otherPlatformLabel}`
                      : ''}
                    . If it's empty when that write-back happens, it's rejected.
                  </>
                )}
              </p>
            </div>
          ))}
          <p className="text-warning text-xs">
            Pick a default value, or skip records that are missing it.
          </p>
        </div>
      )}

      <RadioGroup
        value={value.onEmpty === 'none' ? undefined : value.onEmpty}
        onValueChange={(next) =>
          onChange({ ...value, onEmpty: next as OnEmptyPolicy })
        }
      >
        {OPTIONS.map((o) => (
          <div key={o.value} className="flex items-start gap-2.5">
            <RadioGroupItem
              value={o.value}
              id={`on-empty-${o.value}`}
              className="mt-0.5"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label
                htmlFor={`on-empty-${o.value}`}
                className="cursor-pointer text-sm font-semibold"
              >
                {o.label}
              </Label>
              <p className="text-muted-foreground text-xs">{o.hint}</p>

              {o.value === 'default' && value.onEmpty === 'default' && (
                <div className="mt-0.5">
                  {options.length > 0 ? (
                    <Select
                      value={value.defaultValue}
                      onValueChange={(v) =>
                        onChange({ ...value, defaultValue: v })
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Choose a value…" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label || opt.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : BOOLEAN_TYPES.has((fieldType || '').toLowerCase()) ? (
                    <Select
                      value={value.defaultValue}
                      onValueChange={(v) =>
                        onChange({ ...value, defaultValue: v })
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Choose a value…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={
                        NUMBER_TYPES.has((fieldType || '').toLowerCase())
                          ? 'number'
                          : DATE_TYPES.has((fieldType || '').toLowerCase())
                            ? 'date'
                            : 'text'
                      }
                      value={value.defaultValue}
                      onChange={(e) =>
                        onChange({ ...value, defaultValue: e.target.value })
                      }
                      placeholder={`Default value for ${fieldLabel}`}
                      aria-invalid={showInvalid}
                      className="h-9 text-xs"
                    />
                  )}
                  {showInvalid && (
                    <p className="text-destructive mt-1 text-xs">
                      {NUMBER_TYPES.has((fieldType || '').toLowerCase())
                        ? 'Enter a number.'
                        : DATE_TYPES.has((fieldType || '').toLowerCase())
                          ? 'Enter a valid date.'
                          : 'Enter a value.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
