import {
  AlertCircleIcon,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  HelpCircle,
  Pencil,
  KeyRound,
  Lock,
  Plus,
  Search,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import AutoMapReviewDialog, {
  type AutoMapPreview,
  type AutoMapPreviewRow,
} from './AutoMapReviewDialog';
import type { RequiredReason } from './EmptyValuePolicy';
import ManualMappingDialog, {
  type ManualMappingPrefill,
  type ManualMappingResult,
} from './ManualMappingDialog';
import RuleBuilderModal from './RuleBuilderModal';

import { associationsApi } from '@/api/associations';
import { PlatformIcon } from '@/components/platform';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  areTypesCompatible,
  classifyTypePair,
  matchFields,
  matchValueToOption,
  type MatchableField,
} from '@/lib/fieldMatching';
import { suggestCastRule, type Rule } from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';

function IconLegend() {
  const items: Array<{ icon: React.ReactNode; label: string }> = [
    {
      icon: <KeyRound className="size-3.5" />,
      label:
        'Match field — used to find existing records to update instead of creating duplicates.',
    },
    {
      icon: <Zap className="size-3.5" />,
      label: "Transform rule — converts the value before it's synced.",
    },
    {
      icon: <Lock className="size-3.5" />,
      label:
        "Read-only field, or an action your plan doesn't include — can't be mapped or used until you upgrade.",
    },
    {
      icon: (
        <span className="text-destructive flex size-3.5 items-center justify-center text-sm leading-none font-bold">
          *
        </span>
      ),
      label: 'Required field — must be mapped when choosing a field.',
    },
    { icon: <X className="size-3.5" />, label: 'Remove this mapping.' },
  ];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="What do these icons mean?"
        >
          <HelpCircle />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{it.icon}</span>
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export interface FieldDef {
  key: string;
  label?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  /** Allowed values for an enum field, when the platform publishes them. */
  options?: { value: string; label: string }[];
  [k: string]: unknown;
}

export type OnEmptyPolicy = 'none' | 'default' | 'skip_record';

/** What happens to an already-mapped field on an update (not a create). */
export type MappingUpdatePolicy = 'always' | 'create_only' | 'fill_if_empty';

export type MappingDirection =
  'forward_only' | 'reverse_only' | 'bidirectional';

const DIRECTION_OPTIONS: Array<{ value: MappingDirection; label: string }> = [
  { value: 'forward_only', label: 'Forward Only' },
  { value: 'reverse_only', label: 'Reverse Only' },
  { value: 'bidirectional', label: 'Both Ways' },
];

const UPDATE_POLICY_OPTIONS: Array<{
  value: MappingUpdatePolicy;
  label: string;
  hint: string;
}> = [
  {
    value: 'always',
    label: 'Always update',
    hint: 'Overwrite this field in the destination on every sync, even if it was changed there since the last run.',
  },
  {
    value: 'create_only',
    label: 'Create only',
    hint: 'Set this field only when the record is first created. Later syncs never touch it again, so edits made directly in the destination are preserved.',
  },
  {
    value: 'fill_if_empty',
    label: 'Fill if empty',
    hint: "Only write this field if it's currently blank in the destination. If the destination already has the same value, nothing changes. If the destination already has a different value — a genuine mismatch — nothing is overwritten; use \"On Conflict\" below to decide whether that mismatch skips just this field or the whole record.",
  },
];

/** Only meaningful when updatePolicy is 'fill_if_empty' — decides what a genuine
 *  mismatch (destination already holds a value that differs from the incoming
 *  one — not simply empty) discards. Never triggers when the destination is
 *  empty (that's a fill, not a mismatch) or when both sides already agree. */
const CONFLICT_SCOPE_OPTIONS: Array<{
  value: 'field' | 'record';
  label: string;
  hint: string;
}> = [
  {
    value: 'field',
    label: 'This field only',
    hint: 'When both sides already have a value and they differ (a genuine mismatch — not just an empty destination), that mismatch is logged and only this field is skipped. The rest of the record still updates normally.',
  },
  {
    value: 'record',
    label: 'Skip Whole Record',
    hint: 'When both sides already have a value and they differ (a genuine mismatch — not just an empty destination), the entire record\'s update is discarded, not just this field. Nothing on the record is written this sync.',
  },
];

export interface MappingRow {
  sourceField: string;
  destField: string | string[];
  sourceType?: string;
  destType?: string;
  transformType?: string;
  rules?: unknown[];
  /** Which of this row's (possibly several) destinations is the match/lookup field, if any.
   *  Per-destination rather than per-row because one source can fan out to multiple
   *  destinations, and only one of them may be the match field. Multiple rows across the
   *  mapping can each have one set — see matchOrder for how they combine. */
  matchDestKey?: string | null;
  /** Priority tier when more than one match field is set (lower tried first, first
   *  unambiguous hit wins) — "OR" mode. Left null/unset on every match field means
   *  "AND" mode: all match fields must agree on the same record (the original, and
   *  still default, behaviour). Meaningless when matchDestKey isn't set. */
  matchOrder?: number | null;
  dismissed?: boolean;
  destRules?: Record<string, unknown[]>;
  /** What happens when this destination's value comes out empty, keyed per destination
   *  for the same reason destRules is — one source can fan out to several destinations,
   *  each with its own required-ness. Applies on the forward leg (this row's destField
   *  is the write target) — the platform that "requires" it is the destination platform. */
  destOnEmpty?: Record<string, OnEmptyPolicy>;
  destDefaults?: Record<string, string>;
  /** What happens to this destination's value on an update (not a create), keyed
   *  per destination for the same fan-out reason as destOnEmpty. Missing/'always'
   *  is the historical behaviour — write it every time. */
  destUpdatePolicy?: Record<string, MappingUpdatePolicy>;
  /** Only meaningful when the matching destUpdatePolicy entry is 'fill_if_empty'. 'record'
   *  escalates a genuine conflict on that destination into discarding the whole record's
   *  write, not just this field. Missing/'field' is the default (existing) behaviour. */
  destConflictScope?: Record<string, 'field' | 'record'>;
  /** Same shape as destOnEmpty/destDefaults, but for the reverse leg — the empty-value
   *  policy that applies when a bidirectional row writes back into the SOURCE platform
   *  (i.e. the source platform requires this field on its side). Kept separate from
   *  destOnEmpty/destDefaults because a bidirectional row's two legs can each
   *  independently require the value for different reasons, and a single shared slot
   *  can't hold both policies at once. */
  destReverseOnEmpty?: Record<string, OnEmptyPolicy>;
  destReverseDefaults?: Record<string, string>;
  /** Which leg(s) of a two-way job this mapping applies to. Ignored for one-way jobs. */
  direction?: MappingDirection;
  [k: string]: unknown;
}

/** A "constant" row: one side has no field, so the default value is written on every
 *  record. The only way to satisfy a required destination field that has no counterpart
 *  on the other platform. Rendered in its own section, never in the mapping table. */
export const isConstantRow = (m: MappingRow): boolean => {
  const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
  return !m.sourceField || dests.every((d) => !d);
};

/**
 * Works out which platform(s), if any, actually require a pair's value — and
 * how to phrase it. `destActive`/`sourceActive` are the caller's already-
 * computed direction gates (e.g. ServiceTitan's required flag only counts on
 * a two-way job); this only decides *whether a gated, required field is
 * present*, never re-derives the gating itself.
 *
 * Order is always [dest, source] — a single-reason result reads naturally
 * either way, and callers that need one field list for default-value options
 * (EmptyValuePolicy) try dest's first.
 */
export function requiredReasons({
  sourceField,
  destField,
  sourceActive,
  destActive,
  sourcePlatformLabel,
  destPlatformLabel,
}: {
  sourceField?: FieldDef;
  destField?: FieldDef;
  sourceActive: boolean;
  destActive: boolean;
  sourcePlatformLabel: string;
  destPlatformLabel: string;
}): RequiredReason[] {
  const reasons: RequiredReason[] = [];
  if (destActive && destField?.required) {
    reasons.push({
      platformLabel: destPlatformLabel,
      fieldLabel: destField.label || destField.key,
      options: destField.options,
      fieldType: destField.type,
      context: 'write',
    });
  }
  if (sourceActive && sourceField?.required) {
    reasons.push({
      platformLabel: sourcePlatformLabel,
      fieldLabel: sourceField.label || sourceField.key,
      options: sourceField.options,
      fieldType: sourceField.type,
      context: 'writeback',
    });
  }
  return reasons;
}

/**
 * Builds a new mapping row, repairing a plain type mismatch on the spot: a
 * string→number pair (or any other family cast) gets the matching conversion
 * rule attached immediately, so the mapping is correct on its first sync instead
 * of being rejected by the destination API. Enum destinations get nothing — only
 * the user knows which source value means which option, so those are raised in
 * "Needs your attention" instead.
 */
/** Drops one (source, dest) pair, and the whole row once its last destination goes. */
function removeFrom(
  mappings: MappingRow[],
  sourceKey: string,
  destKey: string,
): MappingRow[] {
  return mappings.flatMap((m) => {
    if (m.sourceField !== sourceKey) return [m];
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    const remaining = dests.filter((dk) => dk !== destKey);
    if (remaining.length === 0) return [];
    const { [destKey]: _rule, ...restRules } = m.destRules || {};
    const { [destKey]: _policy, ...restOnEmpty } = m.destOnEmpty || {};
    const { [destKey]: _default, ...restDefaults } = m.destDefaults || {};
    const { [destKey]: _updatePolicy, ...restUpdatePolicy } =
      m.destUpdatePolicy || {};
    const { [destKey]: _conflictScope, ...restConflictScope } =
      m.destConflictScope || {};
    return [
      {
        ...m,
        destField: remaining.length === 1 ? remaining[0] : remaining,
        destRules: restRules,
        destOnEmpty: restOnEmpty,
        destDefaults: restDefaults,
        destUpdatePolicy: restUpdatePolicy,
        destConflictScope: restConflictScope,
        ...(m.matchDestKey === destKey
          ? { matchDestKey: null, matchOrder: null }
          : {}),
      },
    ];
  });
}

function newMappingRow(
  source: { key: string; type?: string },
  dest: { key: string; type?: string },
): MappingRow {
  const cast =
    classifyTypePair(source.type, dest.type) === 'cast'
      ? suggestCastRule(source.type, dest.type)
      : null;
  return {
    sourceField: source.key,
    destField: dest.key,
    sourceType: source.type,
    destType: dest.type,
    transformType: 'direct',
    rules: [],
    ...(cast ? { destRules: { [dest.key]: [cast] } } : {}),
  };
}

/**
 * Folds one (source, dest) pair into a mappings array: fans out into an
 * existing row for the same source instead of creating a second row for it.
 * Pulled out of the manual dialog's old single-pair `addMapping` so a batch
 * of manually-built pairs can be folded in one at a time via `reduce`. Pure —
 * exported so RequiredFieldDefaults can build the same shape of update
 * without duplicating the fan-out-merge logic.
 */
export function mergeMappingPair(
  prev: MappingRow[],
  sf: FieldDef,
  df: FieldDef,
  extras?: {
    rules?: Rule[];
    onEmpty?: OnEmptyPolicy;
    defaultValue?: string;
  },
): MappingRow[] {
  const row = newMappingRow(sf, df);
  // Anything the caller configured wins over the auto-attached cast rule.
  if (extras?.rules?.length) row.destRules = { [df.key]: extras.rules };
  if (extras?.onEmpty && extras.onEmpty !== 'none') {
    row.destOnEmpty = { [df.key]: extras.onEmpty };
    if (extras.defaultValue !== undefined)
      row.destDefaults = { [df.key]: extras.defaultValue };
  }

  const existingIdx = prev.findIndex((m) => m.sourceField === sf.key);
  if (existingIdx >= 0) {
    const next = [...prev];
    const existing = next[existingIdx];
    const dests = Array.isArray(existing.destField)
      ? existing.destField
      : [existing.destField];
    next[existingIdx] = {
      ...existing,
      destField: [...dests, df.key],
      destRules: { ...(existing.destRules || {}), ...(row.destRules || {}) },
      destOnEmpty: {
        ...(existing.destOnEmpty || {}),
        ...(row.destOnEmpty || {}),
      },
      destDefaults: {
        ...(existing.destDefaults || {}),
        ...(row.destDefaults || {}),
      },
    };
    return next;
  }
  return [...prev, row];
}

/** Writes the empty-value policy for one (source, dest) pair. `side` picks which
 *  platform's requirement this policy satisfies: 'dest' writes into destOnEmpty/
 *  destDefaults (the forward-leg policy — the destination platform requires it);
 *  'source' writes into destReverseOnEmpty/destReverseDefaults (the reverse-leg
 *  policy — the source platform requires it on write-back). Keeping them in
 *  separate slots lets a single bidirectional row carry both independently. Pure
 *  — the caller is responsible for calling onMappingsChange with the result. */
export function setPairEmptyPolicy(
  mappings: MappingRow[],
  pair: { sourceField: string; destKey: string },
  next: { onEmpty: OnEmptyPolicy; defaultValue: string },
  side: 'source' | 'dest',
): MappingRow[] {
  return mappings.map((m) => {
    if (m.sourceField !== pair.sourceField) return m;
    if (side === 'source') {
      return {
        ...m,
        destReverseOnEmpty: {
          ...(m.destReverseOnEmpty || {}),
          [pair.destKey]: next.onEmpty,
        },
        destReverseDefaults: {
          ...(m.destReverseDefaults || {}),
          [pair.destKey]: next.defaultValue,
        },
      };
    }
    return {
      ...m,
      destOnEmpty: { ...(m.destOnEmpty || {}), [pair.destKey]: next.onEmpty },
      destDefaults: {
        ...(m.destDefaults || {}),
        [pair.destKey]: next.defaultValue,
      },
    };
  });
}

/**
 * Adds a constant: a fixed value written into one platform's field on every
 * record, with no counterpart on the other side. This is the only way to
 * satisfy a field a platform requires but the other platform simply doesn't
 * have (ServiceTitan's address.country, customer type, and so on).
 *
 * `side` picks which platform is written into, which decides the shape — an
 * empty sourceField targets the destination on the forward leg, an empty
 * destField targets the source platform on the reverse leg. See
 * FieldMapping.sourceField for why each shape is inert on the opposite leg.
 * Pure — the caller calls onMappingsChange with the result.
 */
export function addConstantRow(
  mappings: MappingRow[],
  params: {
    side: 'source' | 'dest';
    field: FieldDef;
    onEmpty: OnEmptyPolicy;
    defaultValue: string;
    isTwoWay: boolean;
  },
): MappingRow[] {
  const { side, field, onEmpty, defaultValue, isTwoWay } = params;
  const sf: FieldDef = side === 'dest' ? { key: '' } : field;
  const df: FieldDef = side === 'dest' ? field : { key: '' };
  const merged = mergeMappingPair(mappings, sf, df, { onEmpty, defaultValue });
  if (!isTwoWay) return merged;
  return merged.map((m) =>
    m.sourceField === sf.key
      ? {
          ...m,
          direction: (side === 'dest'
            ? 'forward_only'
            : 'reverse_only') as MappingDirection,
        }
      : m,
  );
}

interface RulesModalRef {
  sourceKey: string;
  destKey: string;
}

/** Identifies one (source, dest) pair — a table row, not a mapping row, since a
 *  fanned-out source renders as several rows. */
interface PairRef {
  sourceField: string;
  destKey: string;
}

/** Nudges the user to check the transform rule right after they repoint a
 *  mapping (it was written for the old field) — clears itself after a beat. */
interface GlowTarget extends PairRef {
  stage: 'rule';
}

const GLOW_MS = 10000;
const GLOW_CLASS = 'ring-primary ring-2 ring-offset-2 animate-pulse';

// "Needs your attention" is purely about type mismatches now (cast/value-map)
// — required-field resolution moved to RequiredFieldDefaults, which is
// auto-populated and doesn't need a "needs attention" nudge to surface it.
interface NeedsAttentionItem {
  id: string;
  name: string;
  note: string;
  targetLabel: string;
  isCast?: boolean;
  destKey: string;
  sourceField?: string;
  /** Rendered in destructive rather than warning colours, because ignoring it means the
   *  value is silently discarded at write time rather than merely being odd. */
  blocking?: boolean;
}

function DirectionArrow({ direction }: { direction: MappingDirection }) {
  const Icon =
    direction === 'reverse_only'
      ? ArrowLeft
      : direction === 'forward_only'
        ? ArrowRight
        : ArrowLeftRight;
  return <Icon className="text-muted-foreground size-4" />;
}

function TypeChip({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <Badge variant="outline" className="text-[10.5px] font-semibold capitalize">
      {type.toLowerCase()}
    </Badge>
  );
}

export const PLATFORM_LABEL: Record<string, string> = {
  servicetitan: 'ServiceTitan',
  hubspot: 'HubSpot',
};

/** Score bands are approximate — `matchFields` tiers name/alias/token/structural
 *  matches with modifiers layered on top, so this labels the neighborhood, not
 *  the exact rule that fired. Applied automatically at 85+; below that the user
 *  reviews the suggestion. */
const AUTO_MAP_REVIEW_THRESHOLD = 85;

/** Shared by every entry point into the rule builder (including the Manual Field
 *  Mapping dialog), so the plan gate reads identically everywhere. */
export const TRANSFORM_UPGRADE_MESSAGE =
  "Field transform rules aren't available on your current plan. Upgrade to transform values before they sync.";

const CUSTOM_FIELD_UPGRADE_MESSAGE =
  "Custom properties aren't available on your current plan. Upgrade to create new properties on your connected platforms.";

const MANUAL_MAPPING_UPGRADE_MESSAGE =
  'Your plan uses auto-mapped presets only. Upgrade to build your own field mappings.';

/**
 * Creates a custom property on the platform. When the plan doesn't include custom fields the
 * button stays visible but inert and offers an upgrade — a `disabled` button fires no click,
 * so the lock has to be handled here rather than by the `disabled` attribute.
 */
function AddPropertyButton({
  onClick,
  locked,
  onLockedClick,
  className,
}: {
  onClick: () => void;
  locked: boolean;
  onLockedClick: (message: string) => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={
            locked ? () => onLockedClick(CUSTOM_FIELD_UPGRADE_MESSAGE) : onClick
          }
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-bold tracking-normal normal-case hover:underline',
            locked ? 'text-muted-foreground cursor-not-allowed' : className,
          )}
        >
          {locked ? <Lock className="size-3" /> : <Plus className="size-3" />}
          Add property
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {locked
          ? "Custom properties aren't available on your current plan — upgrade to add them"
          : 'Add a custom property on this platform'}
      </TooltipContent>
    </Tooltip>
  );
}
function autoMapReasonLabel(score: number): string {
  if (score >= 95) return 'Exact name match';
  if (score >= 85) return 'Alias match';
  if (score >= 75) return 'Nested field match';
  return 'Partial match';
}

function PlatformTile({
  platformId,
  size = 20,
}: {
  platformId: string;
  size?: number;
}) {
  return <PlatformIcon platformId={platformId} size={size} />;
}

/**
 * Field picker. A searchable combobox rather than a plain Select because HubSpot
 * routinely returns several hundred properties for one object, which is
 * unnavigable by scrolling alone. Matching runs over both the human label and the
 * raw key, since users search for whichever one they happen to know.
 */
export function FieldSelect({
  fields,
  value,
  onChange,
  placeholder,
  highlightRequired = true,
  className,
}: {
  fields: FieldDef[];
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  /** Whether to surface `required` fields at all — false suppresses both the sort-to-top and
   *  the red asterisk (e.g. a ServiceTitan object on a one-way job, where nothing's required). */
  highlightRequired?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Required fields surface first so they're not buried in a long list.
  const sorted = highlightRequired
    ? [...fields].sort((a, b) => Number(!!b.required) - Number(!!a.required))
    : fields;
  const selected = fields.find((f) => f.key === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full flex-1 justify-between font-normal', className)}
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {selected ? selected.label || selected.key : placeholder}
            {highlightRequired && selected?.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search fields…" />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((f) => (
                <CommandItem
                  key={f.key}
                  // cmdk matches on this string, so both the label and the raw
                  // key are searchable.
                  value={`${f.label || f.key} ${f.key}`}
                  onSelect={() => {
                    onChange(f.key);
                    setOpen(false);
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2.5">
                    <span className="truncate">
                      {f.label || f.key}
                      {highlightRequired && f.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </span>
                    <TypeChip type={f.type} />
                  </span>
                  {f.key === value && (
                    <Check className="ml-2 size-3.5 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FieldMappingCanvasProps {
  sourceFields?: FieldDef[];
  destFields?: FieldDef[];
  mappings?: MappingRow[];
  onMappingsChange: (mappings: MappingRow[]) => void;
  sourcePlatform?: string;
  destPlatform?: string;
  sourceObject?: string;
  destObject?: string;
  onRefreshFields?: () => void;
  fieldsLoading?: boolean;
  projectId?: string;
  /** Real (already-persisted) job id — enables the Manual Field Mapping dialog's
   *  data-based "N% Match" readout once a rule is attached. Omitted during job
   *  creation, since the job doesn't exist yet. */
  jobId?: string;
  onAddSourceField?: (() => void) | null;
  onAddDestField?: (() => void) | null;
  /**
   * Plan gate for custom-property creation. Distinct from passing a `null` handler: `null`
   * means the platform has no custom properties at all (hide it), whereas locked means the
   * capability exists but the org's plan doesn't include it — the button stays visible and
   * offers an upgrade instead.
   */
  addFieldLocked?: boolean;
  /**
   * Runs Auto-map once automatically, as soon as both sourceFields and destFields
   * are non-empty, but only if there are no mappings yet — never overrides mappings
   * the user already built or loaded. Intended for the job-creation wizard, where
   * there's nothing to lose by prefilling; left off for existing-job editing, where
   * zero mappings can be an intentional in-progress state.
   */
  autoMapOnLoad?: boolean;
  /** Only shown for two-way jobs — omitted entirely for one-way (zero visual change). */
  showDirectionToggle?: boolean;
  /**
   * Locks the direction dropdown so it can't be changed after job creation. Pass a
   * boolean to apply to every row, or a predicate to decide per row (e.g. lock only
   * mappings that are already persisted, leave newly added ones editable).
   */
  directionReadOnly?: boolean | ((row: MappingRow) => boolean);
  /**
   * Fires whenever the "Needs your attention" count changes, or the user opens that
   * section for the first time — lets the wizard's Next button require a review before
   * advancing without this component owning navigation itself.
   */
  onAttentionReviewChange?: (info: {
    count: number;
    reviewed: boolean;
  }) => void;
  /**
   * Bump this (e.g. a counter) to smooth-scroll the "Needs your attention" section
   * into view — used by the wizard's Next button when validation blocks on it, since
   * that section can be scrolled out of view in a long field list.
   */
  scrollToAttentionSignal?: number;
}

export default function FieldMappingCanvas({
  sourceFields = [],
  destFields = [],
  mappings = [],
  onMappingsChange,
  sourcePlatform = 'servicetitan',
  destPlatform = 'hubspot',
  sourceObject = '',
  destObject = '',
  fieldsLoading = false,
  projectId,
  jobId,
  onAddSourceField,
  onAddDestField,
  addFieldLocked = false,
  autoMapOnLoad = false,
  showDirectionToggle = false,
  directionReadOnly = false,
  onAttentionReviewChange,
  scrollToAttentionSignal,
}: FieldMappingCanvasProps) {
  const attentionSectionRef = useRef<HTMLDivElement>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [composerPrefill, setComposerPrefill] =
    useState<ManualMappingPrefill | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [rulesModal, setRulesModal] = useState<RulesModalRef | null>(null);
  const [showReadOnly, setShowReadOnly] = useState(false);
  const [editingPair, setEditingPair] = useState<PairRef | null>(null);
  const [editDraft, setEditDraft] = useState<PairRef | null>(null);
  const [glow, setGlow] = useState<GlowTarget | null>(null);
  const [naOpen, setNaOpen] = useState(false);
  const [attentionReviewed, setAttentionReviewed] = useState(false);
  const { confirm } = useConfirmDialog();

  // Plan gating: a plan whose `allowed_transform_types` is `direct` alone gets no rule
  // builder at all — the ~60 rules don't map onto the seven transform-type values, so the
  // capability is gated as a whole (the API enforces the same on save).
  const entitlements = useEntitlements();
  const canUseTransforms = entitlements.transformRules;
  // `field_mapping: standard` means auto-map presets only — building mappings by hand is the
  // paid capability. Resolving *required* unmapped fields stays open on every plan, otherwise
  // a standard-plan org could end up unable to create a valid job at all.
  const canManualMap = entitlements.fieldMappingAtLeast('custom');
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();

  /** Whether this exact (source, dest) pair is already mapped — the only case we block. */
  const isDuplicatePair = (src: string, dest: string): boolean => {
    const row = mappings.find((m) => m.sourceField === src);
    if (!row) return false;
    const dests = Array.isArray(row.destField)
      ? row.destField
      : [row.destField];
    return dests.includes(dest);
  };

  /** A row's source type, preferring the live discovered field over whatever the
   *  row was stamped with when it was created (rows loaded from the API have no
   *  stamped type at all). */
  const sourceTypeOf = (m: MappingRow): string | undefined =>
    sourceFields.find((f) => f.key === m.sourceField)?.type ?? m.sourceType;

  // Constant rows (one side deliberately empty — see isConstantRow) have no
  // source-to-destination story to tell, so they're excluded from this table;
  // RequiredFieldDefaults is where they're surfaced and edited.
  const pairRows = mappings.filter((m) => !isConstantRow(m));

  const readOnlyKeys = new Set(
    destFields.filter((f) => f.readOnly).map((f) => f.key),
  );
  const readOnlyDestFields = destFields.filter((f) => f.readOnly);

  // ServiceTitan's `required` flag only matters on a two-way job — the reverse leg writes into
  // whichever side is ServiceTitan, so on one-way jobs (where the ServiceTitan side is either
  // purely read as source, or a plain one-way write as dest) it deliberately doesn't apply, per
  // product decision — this restriction covers ONLY ServiceTitan; any other platform's required
  // flag (e.g. HubSpot's pre-existing required-dest behavior) stays active unconditionally, on
  // every direction, exactly as it worked before this feature existed.
  const destRequiredActive =
    destPlatform !== 'servicetitan' || showDirectionToggle;
  const sourceRequiredActive =
    sourcePlatform !== 'servicetitan' || showDirectionToggle;

  // Counts only — feed the "N of M fields ready" progress stat below.
  // *Resolving* required fields (mapped or not) lives entirely in
  // RequiredFieldDefaults now, driven by the same active-gates.
  const requiredDest = destRequiredActive
    ? destFields.filter((f) => f.required && !f.readOnly)
    : [];

  // Every (source, dest) pair whose types don't line up, split by how it can be
  // repaired. `cast` pairs normally arrive with a conversion rule already
  // attached (see newMappingRow), so they only surface here if the user removed
  // it; `value_map` pairs always need the user, since only they know which
  // source value means which destination option.
  const typeIssues = mappings.flatMap((m) => {
    if (m.dismissed || isConstantRow(m)) return [];
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    // The live field list is the authority — `sourceType` is only stamped onto
    // rows this session created, so mappings loaded from the API have none and
    // would otherwise never be checked at all.
    const sourceType = sourceTypeOf(m);
    return dests.flatMap((dk) => {
      const df = destFields.find((f) => f.key === dk);
      const issue = classifyTypePair(sourceType, df?.type);
      if (issue === 'ok') return [];
      const destRules = (m.destRules?.[dk] || []) as { type: string }[];
      // A cast pair with its rule still attached is already handled, and same
      // for a value_map pair that already has a rule (e.g. auto-detected from
      // real values) — the row is no longer silently broken, even if some
      // values in the map are still blank pending user review.
      if (issue === 'cast' && destRules.length > 0) return [];
      if (
        issue === 'value_map' &&
        destRules.some((r) => r.type === 'value_map')
      )
        return [];
      return [{ mapping: m, destKey: dk, destField: df, issue, sourceType }];
    });
  });

  const needsAttention: NeedsAttentionItem[] = [
    ...typeIssues.map(
      ({ mapping: m, destKey, destField: df, issue, sourceType }) => ({
        id: `tm-${m.sourceField}-${destKey}`,
        name:
          sourceFields.find((f) => f.key === m.sourceField)?.label ??
          m.sourceField,
        note:
          issue === 'value_map'
            ? `"${df?.label ?? destKey}" only accepts values from a fixed list — anything else is dropped without an error. Map each ${sourceType ?? 'source'} value to one of its options.`
            : `Type mismatch: ${sourceType ?? '?'} → ${df?.type ?? '?'}. Add a transform rule.`,
        targetLabel: df?.label ?? destKey,
        isCast: true,
        blocking: issue === 'value_map',
        sourceField: m.sourceField,
        destKey,
      }),
    ),
  ];

  const naCount = needsAttention.length;

  // A newly-surfaced attention item (e.g. a mapping edit reintroduces a type
  // mismatch) needs a fresh review — only an *increase* resets it, so items
  // resolving down doesn't spuriously re-block Next.
  const prevNaCountRef = useRef(naCount);
  useEffect(() => {
    if (naCount > prevNaCountRef.current) setAttentionReviewed(false);
    prevNaCountRef.current = naCount;
  }, [naCount]);

  useEffect(() => {
    onAttentionReviewChange?.({ count: naCount, reviewed: attentionReviewed });
  }, [naCount, attentionReviewed, onAttentionReviewChange]);

  useEffect(() => {
    if (!scrollToAttentionSignal || naCount === 0) return;
    // Forcing the section open (even if the user had collapsed it) and
    // marking it reviewed here is what breaks the loop: the wizard's Next
    // button blocks on `reviewed === false` and bumps this signal every time
    // it does, so without this the section reopens but never counts as seen —
    // Next stays blocked and the toast fires again on every click.
    setNaOpen(true);
    setAttentionReviewed(true);
    // Wait for the expanded content to paint before measuring where to
    // scroll — scrolling in the same tick would center against the still-
    // collapsed height.
    const raf = requestAnimationFrame(() => {
      attentionSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollToAttentionSignal]);

  // The guided highlight is a nudge, not a modal — it gets out of the way on its
  // own if the user has moved on to something else.
  useEffect(() => {
    if (!glow) return;
    const timer = setTimeout(() => setGlow(null), GLOW_MS);
    return () => clearTimeout(timer);
  }, [glow]);

  const readyCount = pairRows.filter((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.every(
      (dk) =>
        !readOnlyKeys.has(dk) &&
        areTypesCompatible(
          sourceTypeOf(m),
          destFields.find((f) => f.key === dk)?.type,
        ),
    );
  }).length;
  const totalRef = Math.max(requiredDest.length, pairRows.length, 1);
  const progress = Math.min(100, Math.round((readyCount / totalRef) * 100));

  const filtered = mapSearch
    ? pairRows.filter((m) => {
        const sl = (
          sourceFields.find((f) => f.key === m.sourceField)?.label ??
          m.sourceField
        ).toLowerCase();
        const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
        const dl = dests
          .map((dk) => destFields.find((f) => f.key === dk)?.label ?? dk)
          .join(' ')
          .toLowerCase();
        return (
          sl.includes(mapSearch.toLowerCase()) ||
          dl.includes(mapSearch.toLowerCase())
        );
      })
    : mappings;

  /** Any number of destinations can be match fields at once — see matchOrder on
   *  MappingRow for how AND ("must all agree") vs. OR ("try in order, first hit
   *  wins") is decided. Toggling one on never disturbs the others; a newly added
   *  field only gets an order number if the set is already in OR mode. */
  const toggleMatch = (sourceKey: string, destKey: string) => {
    const matchRows = mappings.filter((m) => m.matchDestKey);
    const isOrMode = matchRows.some((m) => m.matchOrder != null);
    const maxOrder = matchRows.reduce(
      (mx, m) => Math.max(mx, m.matchOrder ?? 0),
      0,
    );
    onMappingsChange(
      mappings.map((m) => {
        if (m.sourceField !== sourceKey) return m;
        if (m.matchDestKey === destKey) {
          return { ...m, matchDestKey: null, matchOrder: null };
        }
        return {
          ...m,
          matchDestKey: destKey,
          matchOrder: isOrMode ? maxOrder + 1 : null,
        };
      }),
    );
  };

  /** Switches every currently-set match field between AND (matchOrder cleared
   *  on all of them) and OR (sequential order assigned in current array order). */
  const setMatchMode = (mode: 'and' | 'or') => {
    let next = 0;
    onMappingsChange(
      mappings.map((m) => {
        if (!m.matchDestKey) return m;
        next += 1;
        return { ...m, matchOrder: mode === 'or' ? next : null };
      }),
    );
  };

  /** Reorders one match field within OR mode by swapping matchOrder with its neighbour. */
  const moveMatchOrder = (sourceKey: string, destKey: string, dir: -1 | 1) => {
    const ordered = mappings
      .filter((m) => m.matchDestKey)
      .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0));
    const idx = ordered.findIndex(
      (m) => m.sourceField === sourceKey && m.matchDestKey === destKey,
    );
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[swapIdx];
    const aOrder = a.matchOrder;
    onMappingsChange(
      mappings.map((m) => {
        if (
          m.sourceField === a.sourceField &&
          m.matchDestKey === a.matchDestKey
        ) {
          return { ...m, matchOrder: b.matchOrder };
        }
        if (
          m.sourceField === b.sourceField &&
          m.matchDestKey === b.matchDestKey
        ) {
          return { ...m, matchOrder: aOrder };
        }
        return m;
      }),
    );
  };

  const remove = (sourceKey: string, destKey: string) =>
    onMappingsChange(removeFrom(mappings, sourceKey, destKey));

  const setUpdatePolicy = (
    sourceKey: string,
    destKey: string,
    policy: MappingUpdatePolicy,
  ) =>
    onMappingsChange(
      mappings.map((m) =>
        m.sourceField === sourceKey
          ? {
              ...m,
              destUpdatePolicy: {
                ...(m.destUpdatePolicy || {}),
                [destKey]: policy,
              },
            }
          : m,
      ),
    );

  const setConflictScope = (
    sourceKey: string,
    destKey: string,
    scope: 'field' | 'record',
  ) =>
    onMappingsChange(
      mappings.map((m) =>
        m.sourceField === sourceKey
          ? {
              ...m,
              destConflictScope: {
                ...(m.destConflictScope || {}),
                [destKey]: scope,
              },
            }
          : m,
      ),
    );

  /**
   * Repoints an existing (source, dest) pair. Everything hanging off the old
   * destination key — its rules, empty-value policy and match-field flag — moves
   * with it, so an edit doesn't quietly discard configuration the way the old
   * delete-and-re-add workflow did.
   */
  const editMapping = (from: PairRef, to: PairRef) => {
    const row = mappings.find((m) => m.sourceField === from.sourceField);
    if (!row) return;
    const carried = {
      rules: (row.destRules?.[from.destKey] ?? []) as Rule[],
      onEmpty: row.destOnEmpty?.[from.destKey],
      defaultValue: row.destDefaults?.[from.destKey],
      wasMatch: row.matchDestKey === from.destKey,
      matchOrder: row.matchOrder,
      updatePolicy: row.destUpdatePolicy?.[from.destKey],
      conflictScope: row.destConflictScope?.[from.destKey],
      direction: row.direction,
    };

    const sf = sourceFields.find((f) => f.key === to.sourceField);
    const df = destFields.find((f) => f.key === to.destKey);
    if (!sf || !df) return;

    // Drop the old pair first so a same-source edit doesn't collide with itself.
    const withoutOld = removeFrom(mappings, from.sourceField, from.destKey);
    const next = mergeMappingPair(withoutOld, sf, df, {
      // A repointed field keeps its rules only while the source type is
      // unchanged; otherwise the auto-attached cast for the new pair is the
      // better starting point, and the glow prompts a review either way.
      rules: sf.type === sourceTypeOf(row) ? carried.rules : undefined,
      onEmpty: carried.onEmpty,
      defaultValue: carried.defaultValue,
    }).map((m) =>
      m.sourceField === to.sourceField
        ? {
            ...m,
            ...(carried.wasMatch
              ? { matchDestKey: to.destKey, matchOrder: carried.matchOrder }
              : {}),
            ...(carried.updatePolicy
              ? {
                  destUpdatePolicy: {
                    ...(m.destUpdatePolicy || {}),
                    [to.destKey]: carried.updatePolicy,
                  },
                }
              : {}),
            ...(carried.conflictScope
              ? {
                  destConflictScope: {
                    ...(m.destConflictScope || {}),
                    [to.destKey]: carried.conflictScope,
                  },
                }
              : {}),
            ...(carried.direction ? { direction: carried.direction } : {}),
          }
        : m,
    );

    onMappingsChange(next);
    setEditingPair(null);
    setEditDraft(null);
    setGlow({ ...to, stage: 'rule' });
    toast.success(
      'Mapping updated — check the transform rule still fits the new field.',
    );
  };

  const setDirection = (sourceKey: string, direction: MappingDirection) =>
    onMappingsChange(
      mappings.map((m) =>
        m.sourceField === sourceKey ? { ...m, direction } : m,
      ),
    );

  // Always tracks the latest `mappings` prop — enrichValueMapSuggestions applies
  // its patch after an async fetch resolves, by which point the `mappings`
  // closure it was called with can be stale (further edits, or a removed row).
  const mappingsRef = useRef(mappings);
  mappingsRef.current = mappings;

  /**
   * After auto-map links a string source field to an enum destination field
   * (classifyTypePair === 'value_map'), fetches real values this project has
   * already synced for that source field and seeds a Map Values rule from
   * them — an unambiguous normalized match (matchValueToOption) gets the
   * matching destination option, anything else is still listed with a blank
   * destination so the user sees it and can fill it in via the rule builder,
   * same as a manually-built value_map rule. Best-effort and fire-and-forget:
   * `added` rows already work fine without this (they just show up in "Needs
   * your attention" as before), so a fetch failure or an empty sample set is
   * silently a no-op.
   */
  const enrichValueMapSuggestions = useCallback(
    async (added: MappingRow[]) => {
      if (!projectId || !sourceObject) return;
      const targets = added.flatMap((row) => {
        const dests = Array.isArray(row.destField)
          ? row.destField
          : [row.destField];
        const sf = sourceFields.find((f) => f.key === row.sourceField);
        return dests
          .filter((dk) => {
            const df = destFields.find((f) => f.key === dk);
            return (
              classifyTypePair(sf?.type, df?.type) === 'value_map' &&
              (df?.options?.length ?? 0) > 0
            );
          })
          .map((dk) => ({ sourceField: row.sourceField, destKey: dk }));
      });
      if (targets.length === 0) return;

      const sourceFieldKeys = Array.from(
        new Set(targets.map((t) => t.sourceField)),
      );
      const samplesByField = new Map<string, string[]>();
      await Promise.all(
        sourceFieldKeys.map(async (key) => {
          try {
            const values = await associationsApi.getFieldValueSamples(
              projectId,
              sourceObject,
              key,
            );
            samplesByField.set(key, values);
          } catch {
            // Best-effort — this source field's targets just stay unenriched.
          }
        }),
      );

      const patches = targets
        .map((t) => {
          const values = samplesByField.get(t.sourceField) ?? [];
          if (values.length === 0) return null;
          const options =
            destFields.find((f) => f.key === t.destKey)?.options ?? [];
          const map: Record<string, string> = {};
          for (const v of values) map[v] = matchValueToOption(v, options) ?? '';
          return { ...t, map };
        })
        .filter(
          (
            p,
          ): p is {
            sourceField: string;
            destKey: string;
            map: Record<string, string>;
          } => p !== null,
        );
      if (patches.length === 0) return;

      onMappingsChange(
        mappingsRef.current.map((m) => {
          const patch = patches.find((p) => p.sourceField === m.sourceField);
          if (!patch) return m;
          // Don't clobber a value_map rule the user already set while this was in flight.
          const existing =
            (m.destRules?.[patch.destKey] as { type: string }[] | undefined) ??
            [];
          if (existing.some((r) => r.type === 'value_map')) return m;
          return {
            ...m,
            destRules: {
              ...(m.destRules || {}),
              [patch.destKey]: [{ type: 'value_map', map: patch.map }],
            },
          };
        }),
      );
    },
    [projectId, sourceObject, sourceFields, destFields, onMappingsChange],
  );

  /**
   * Maps every remaining source field that has a confident destination match.
   * Always additive: existing rows (and their transform rules, match-field flag
   * and direction) are kept as-is and their source/destination keys are excluded
   * from matching, so running Auto-map after hand-mapping fills the gaps instead
   * of wiping the work.
   */
  const runAutoMap = useCallback((): number => {
    const usedSourceKeys = new Set(mappings.map((m) => m.sourceField));
    const usedDestKeys = new Set(
      mappings.flatMap((m) =>
        Array.isArray(m.destField) ? m.destField : [m.destField],
      ),
    );

    const added: MappingRow[] = matchFields(sourceFields, destFields, {
      usedSourceKeys,
      usedDestKeys,
    }).map(({ source, dest }) => newMappingRow(source, dest));

    if (added.length > 0) {
      onMappingsChange([...mappings, ...added]);
      void enrichValueMapSuggestions(added);
    }
    return added.length;
  }, [
    mappings,
    sourceFields,
    destFields,
    onMappingsChange,
    enrichValueMapSuggestions,
  ]);

  const [autoMapPreview, setAutoMapPreview] = useState<AutoMapPreview | null>(
    null,
  );

  /** Builds the review-dialog data without touching `mappings` — nothing is
   *  applied until the user confirms in the dialog. */
  const buildAutoMapPreview = useCallback((): AutoMapPreview | null => {
    const usedSourceKeys = new Set(mappings.map((m) => m.sourceField));
    const usedDestKeys = new Set(
      mappings.flatMap((m) =>
        Array.isArray(m.destField) ? m.destField : [m.destField],
      ),
    );

    const results = matchFields(sourceFields, destFields, {
      usedSourceKeys,
      usedDestKeys,
    });
    if (results.length === 0) return null;

    const matched: AutoMapPreviewRow[] = [];
    const review: AutoMapPreviewRow[] = [];
    for (const { source, dest, score } of results) {
      const row = { source, dest, score, reason: autoMapReasonLabel(score) };
      (score >= AUTO_MAP_REVIEW_THRESHOLD ? matched : review).push(row);
    }

    const matchedKeys = new Set(results.map((r) => r.source.key));
    const unmatched = sourceFields.filter(
      (f) =>
        f.type !== 'object' &&
        !usedSourceKeys.has(f.key) &&
        !matchedKeys.has(f.key),
    );

    return { matched, review, unmatched, existingCount: mappings.length };
  }, [mappings, sourceFields, destFields]);

  const handleAutoMapClick = () => {
    const preview = buildAutoMapPreview();
    if (!preview) {
      toast.info(
        mappings.length > 0
          ? 'No further matches found — the remaining fields need to be mapped manually.'
          : 'No matching fields found between these two objects.',
      );
      return;
    }
    setAutoMapPreview(preview);
  };

  const applyAutoMap = (
    rows: { source: MatchableField; dest: MatchableField }[],
  ) => {
    const added: MappingRow[] = rows.map(({ source, dest }) =>
      newMappingRow(source, dest),
    );
    onMappingsChange([...mappings, ...added]);
    void enrichValueMapSuggestions(added);
    setAutoMapPreview(null);
    const repaired = added.filter((m) => m.destRules).length;
    toast.success(
      `Auto-mapped ${added.length} field${added.length !== 1 ? 's' : ''}.` +
        (repaired > 0
          ? ` ${repaired} got a conversion rule to match the destination type.`
          : ''),
    );
  };

  // Auto-map on load waits for the field lists to stop growing before it runs.
  // Fields arrive from two independent platform calls and custom fields can be
  // appended afterwards, so mapping against a half-loaded list is how fields end
  // up "missing until you click Auto Map". We debounce on every change to the
  // field counts and cap the total wait, so a list that keeps trickling in still
  // gets mapped.
  const AUTO_MAP_SETTLE_MS = 700;
  const AUTO_MAP_MAX_WAIT_MS = 5000;
  const [autoMapping, setAutoMapping] = useState(false);
  const autoMapRanRef = useRef(false);
  const autoMapWaitStartRef = useRef<number | null>(null);
  // Kept in a ref so the debounce timer always fires the latest closure without
  // restarting every time `mappings` gets a new identity.
  const runAutoMapRef = useRef(runAutoMap);
  runAutoMapRef.current = runAutoMap;

  useEffect(() => {
    // Only ever fires once per mount — if the user clears every mapping
    // afterwards that's deliberate, not something to auto-refill.
    if (!autoMapOnLoad || autoMapRanRef.current) return;
    if (mappings.length > 0) return;
    if (fieldsLoading) return;
    if (sourceFields.length === 0 || destFields.length === 0) return;

    if (autoMapWaitStartRef.current === null)
      autoMapWaitStartRef.current = Date.now();
    setAutoMapping(true);

    const elapsed = Date.now() - autoMapWaitStartRef.current;
    const delay = Math.max(
      0,
      Math.min(AUTO_MAP_SETTLE_MS, AUTO_MAP_MAX_WAIT_MS - elapsed),
    );
    const timer = setTimeout(() => {
      autoMapRanRef.current = true;
      setAutoMapping(false);
      runAutoMapRef.current();
    }, delay);
    return () => clearTimeout(timer);
    // Field-list *lengths* are the settle signal — the arrays themselves get a
    // new identity on every parent render, which would reset the timer forever.
  }, [
    autoMapOnLoad,
    fieldsLoading,
    sourceFields.length,
    destFields.length,
    mappings.length,
  ]);

  const applyManualMappings = (pairs: ManualMappingResult[]) => {
    if (pairs.length === 0) return;
    onMappingsChange(
      pairs.reduce(
        (acc, { source, dest, rules, onEmpty, defaultValue }) =>
          mergeMappingPair(acc, source, dest, { rules, onEmpty, defaultValue }),
        mappings,
      ),
    );
    setShowComposer(false);
    setComposerPrefill(null);
    toast.success(
      `Mapped ${pairs.length} field${pairs.length !== 1 ? 's' : ''}.`,
    );
  };

  const saveRules = useCallback(
    (sourceKey: string, destKey: string, rules: unknown[]) => {
      onMappingsChange(
        mappings.map((m) => {
          if (m.sourceField !== sourceKey) return m;
          return {
            ...m,
            destRules: { ...(m.destRules || {}), [destKey]: rules },
          };
        }),
      );
    },
    [mappings, onMappingsChange],
  );

  /**
   * Opens the rule builder for one (source, dest) pair. When the pair is blocked
   * on an enum destination, the Map Values rule is seeded first — pre-filled with
   * the source field's own options when the platform publishes them — so the user
   * lands on the editor they need instead of hunting for it in a list of 60 rules.
   */
  const openRulesModal = (
    sourceKey: string,
    destKey: string,
    seedValueMap = false,
  ) => {
    if (seedValueMap) {
      const existing = mappings.find((m) => m.sourceField === sourceKey);
      const rules = (existing?.destRules?.[destKey] ?? []) as Rule[];
      if (!rules.some((r) => r.type === 'value_map')) {
        const sourceOptions =
          sourceFields.find((f) => f.key === sourceKey)?.options ?? [];
        const seed: Rule = {
          type: 'value_map',
          map: Object.fromEntries(
            sourceOptions.length > 0
              ? sourceOptions.map((o) => [o.value, ''])
              : [['', '']],
          ),
        };
        saveRules(sourceKey, destKey, [...rules, seed]);
      }
    }
    setRulesModal({ sourceKey, destKey });
  };

  const rulesMapping = rulesModal
    ? mappings.find((m) => m.sourceField === rulesModal.sourceKey)
    : null;
  const rulesDestKey = rulesModal?.destKey ?? null;
  const rulesInit =
    rulesMapping && rulesDestKey
      ? rulesMapping.destRules?.[rulesDestKey] || []
      : [];

  // Flat (source, dest) pairs for the "Matched by" picker — a plain per-source list would
  // collapse a fanned-out source's multiple destinations into one indistinguishable option.
  const matchOptions = mappings.flatMap((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.map((destKey) => ({ sourceField: m.sourceField, destKey }));
  });
  // Every currently-selected match field, in evaluation order (OR mode only —
  // meaningless but harmless in AND mode, where every field is required regardless).
  const activeMatches = mappings
    .filter((m) => m.matchDestKey)
    .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0))
    .map((m) => ({
      sourceField: m.sourceField,
      destKey: m.matchDestKey as string,
      matchOrder: m.matchOrder ?? null,
    }));
  const matchMode: 'and' | 'or' = activeMatches.some(
    (m) => m.matchOrder != null,
  )
    ? 'or'
    : 'and';
  // Options not already picked as a match field — what the "add" picker offers.
  const addableMatchOptions = matchOptions.filter(
    (o) =>
      !activeMatches.some(
        (m) => m.sourceField === o.sourceField && m.destKey === o.destKey,
      ),
  );
  const totalFields = Math.max(requiredDest.length, pairRows.length);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-60 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold">
                <span
                  className={cn(
                    naCount === 0 && pairRows.length > 0 && 'text-success',
                  )}
                >
                  {readyCount}
                </span>
                <span className="text-muted-foreground font-medium">
                  {' '}
                  of {totalFields} fields ready
                </span>
              </h3>
              <Progress value={progress} className="h-1.5 max-w-xs" />

              {naCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="bg-warning/10 text-warning hover:bg-warning/10 gap-1.5"
                >
                  <span className="bg-warning size-1.5 rounded-full" />
                  {naCount} need attention
                </Badge>
              ) : (
                pairRows.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-success/10 text-success hover:bg-success/10 gap-1"
                  >
                    <Check className="size-3" />
                    All mapped
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-l pl-4">
            <KeyRound size={16} className="text-primary" />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              Matched by
            </span>

            {activeMatches.map((am, idx) => {
              const field = sourceFields.find((f) => f.key === am.sourceField);
              const destF = destFields.find((f) => f.key === am.destKey);
              const fansOut =
                matchOptions.filter((o) => o.sourceField === am.sourceField)
                  .length > 1;
              return (
                <Badge
                  key={`${am.sourceField}::${am.destKey}`}
                  variant="secondary"
                  className="gap-1 whitespace-nowrap"
                >
                  {matchMode === 'or' && (
                    <span className="font-mono text-[10px] opacity-70">
                      {idx + 1}.
                    </span>
                  )}
                  {field?.label ?? am.sourceField}
                  {fansOut ? ` → ${destF?.label ?? am.destKey}` : ''}
                  {matchMode === 'or' && activeMatches.length > 1 && (
                    <span className="flex items-center">
                      <button
                        type="button"
                        className="hover:text-foreground disabled:opacity-30"
                        disabled={idx === 0}
                        onClick={() =>
                          moveMatchOrder(am.sourceField, am.destKey, -1)
                        }
                        aria-label="Try this field earlier"
                      >
                        <ChevronUp size={11} />
                      </button>
                      <button
                        type="button"
                        className="hover:text-foreground disabled:opacity-30"
                        disabled={idx === activeMatches.length - 1}
                        onClick={() =>
                          moveMatchOrder(am.sourceField, am.destKey, 1)
                        }
                        aria-label="Try this field later"
                      >
                        <ChevronDown size={11} />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => toggleMatch(am.sourceField, am.destKey)}
                    aria-label="Remove match field"
                  >
                    <X size={11} />
                  </button>
                </Badge>
              );
            })}

            {activeMatches.length >= 2 && (
              <div className="bg-muted flex items-center gap-0.5 rounded-md p-0.5">
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-medium',
                    matchMode === 'and'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setMatchMode('and')}
                  title="All match fields must agree on the same record"
                >
                  AND
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-medium',
                    matchMode === 'or'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setMatchMode('or')}
                  title="Try each match field in order — first hit wins"
                >
                  OR
                </button>
              </div>
            )}

            <Select
              value=""
              onValueChange={(v) => {
                const sep = v.indexOf('::');
                if (sep < 0) return;
                toggleMatch(v.slice(0, sep), v.slice(sep + 1));
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-44">
                <SelectValue
                  placeholder={
                    activeMatches.length === 0
                      ? 'Choose field'
                      : '+ Add match field'
                  }
                />
              </SelectTrigger>
              <SelectContent align="start">
                {addableMatchOptions.length === 0 ? (
                  <div className="text-muted-foreground px-2.5 py-1.5 text-xs">
                    {matchOptions.length === 0
                      ? 'No fields mapped yet'
                      : 'All mapped fields already added'}
                  </div>
                ) : (
                  addableMatchOptions.map(({ sourceField, destKey }) => {
                    const field = sourceFields.find(
                      (f) => f.key === sourceField,
                    );
                    const destF = destFields.find((f) => f.key === destKey);
                    // Only qualify with the destination when this source fans out to more
                    // than one — the common single-destination case stays uncluttered.
                    const fansOut =
                      matchOptions.filter((o) => o.sourceField === sourceField)
                        .length > 1;
                    return (
                      <SelectItem
                        key={`${sourceField}::${destKey}`}
                        value={`${sourceField}::${destKey}`}
                      >
                        {field?.label ?? sourceField}
                        {fansOut ? ` → ${destF?.label ?? destKey}` : ''}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAutoMapClick}
            size="sm"
            className="ml-auto"
            disabled={
              autoMapping ||
              sourceFields.length === 0 ||
              destFields.length === 0
            }
          >
            {autoMapping ? <Spinner /> : <Wand2 className="size-4" />}
            {autoMapping ? 'Auto-mapping…' : 'Auto-map'}
          </Button>
        </CardContent>
      </Card>
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <div className="flex">
                <h3 className="text-xl font-semibold">Manage your fields</h3>
              </div>
              <span className="mr-1 text-xs">Field mappings</span>
            </div>
            <div className="flex items-center gap-2.5">
              <IconLegend />

              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  placeholder="Search fields…"
                />
              </InputGroup>
              {readOnlyDestFields.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showReadOnly ? 'secondary' : 'outline'}
                      onClick={() => setShowReadOnly((p) => !p)}
                      className="shrink-0"
                    >
                      Read-only fields
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {showReadOnly ? 'Hide' : 'Show'} the{' '}
                    {readOnlyDestFields.length} destination field
                    {readOnlyDestFields.length !== 1 ? 's' : ''} that can't be
                    mapped to.
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={mappings.length === 0}
                    onClick={() =>
                      confirm({
                        variant: 'danger',
                        title: 'Clear all mappings?',
                        description:
                          "This removes every field mapping below. This can't be undone.",
                        confirmLabel: 'Clear all',
                        onConfirm: () => onMappingsChange([]),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Clear all mappings
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showComposer ? 'secondary' : 'outline'}
                    onClick={() => {
                      if (!canManualMap) {
                        promptUpgrade(MANUAL_MAPPING_UPGRADE_MESSAGE);
                        return;
                      }
                      setComposerPrefill(null);
                      setShowComposer((p) => !p);
                    }}
                    className={cn(
                      'shrink-0',
                      !canManualMap &&
                        'text-muted-foreground cursor-not-allowed',
                    )}
                  >
                    {canManualMap ? <Plus /> : <Lock />} Add mapping
                  </Button>
                </TooltipTrigger>
                {!canManualMap && (
                  <TooltipContent side="top">
                    Your plan uses auto-mapped presets only — upgrade to add
                    mappings by hand
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          {showReadOnly && readOnlyDestFields.length > 0 && (
            <div className="bg-muted/30 border-b px-4 py-3">
              <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
                Read-only destination fields — can't be mapped to
              </p>
              <div className="flex flex-wrap gap-1.5">
                {readOnlyDestFields.map((f) => (
                  <Badge
                    key={f.key}
                    variant="secondary"
                    className="text-muted-foreground gap-1.5"
                  >
                    <Lock className="size-3" /> {f.label || f.key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <ManualMappingDialog
            open={showComposer}
            onOpenChange={(open) => {
              setShowComposer(open);
              if (!open) setComposerPrefill(null);
            }}
            sourceFields={sourceFields}
            destFields={destFields}
            readOnlyKeys={readOnlyKeys}
            isDuplicatePair={isDuplicatePair}
            highlightSourceRequired={sourceRequiredActive}
            highlightDestRequired={destRequiredActive}
            sourcePlatformLabel={
              PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform
            }
            destPlatformLabel={PLATFORM_LABEL[destPlatform] ?? destPlatform}
            prefill={composerPrefill}
            onApply={applyManualMappings}
            projectId={projectId}
            sourceObject={sourceObject}
            jobId={jobId}
          />
          <div className="overflow-hidden rounded-4xl border">
            <div className="bg-input flex items-center gap-2 border-b px-4 py-2.5">
              <div className="text-muted-foreground flex flex-1 items-center gap-2 text-[11px] font-bold tracking-wide">
                <PlatformTile platformId={sourcePlatform} size={18} />
                {(
                  PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform
                ).toUpperCase()}
                {sourceObject && (
                  <Badge className="bg-primary/10 text-primary">
                    {sourceObject}
                  </Badge>
                )}
                {onAddSourceField && (
                  <AddPropertyButton
                    onClick={onAddSourceField}
                    locked={addFieldLocked}
                    onLockedClick={promptUpgrade}
                    className="text-primary"
                  />
                )}
              </div>
              <div className="text-muted-foreground flex flex-1 items-center gap-2 text-[11px] font-bold tracking-wide">
                <PlatformTile platformId={destPlatform} size={18} />
                {(PLATFORM_LABEL[destPlatform] ?? destPlatform).toUpperCase()}
                {destObject && (
                  <Badge className="bg-hubspot/10 text-hubspot">
                    {destObject}
                  </Badge>
                )}
                {onAddDestField && (
                  <AddPropertyButton
                    onClick={onAddDestField}
                    locked={addFieldLocked}
                    onLockedClick={promptUpgrade}
                    className="text-hubspot"
                  />
                )}
              </div>
            </div>

            <div className="max-h-150 overflow-y-auto">
              {autoMapping && (
                <div className="text-muted-foreground flex items-center justify-center gap-3 border-b py-10 text-sm">
                  <Spinner />
                  Waiting for all fields to load, then matching them
                  automatically…
                </div>
              )}

              {naCount === 0 && pairRows.length > 0 && !mapSearch && (
                <Alert className="bg-success/10 rounded-none border-x-0 border-t-0">
                  <Check className="text-success" />
                  <AlertDescription className="text-foreground">
                    <span className="font-bold">You're all set</span> — every
                    field is mapped and ready to sync.
                  </AlertDescription>
                </Alert>
              )}

              {naCount > 0 && !mapSearch && (
                <div ref={attentionSectionRef}>
                  <Table>
                    <TableBody>
                      <TableRow
                        className="hover:bg-transparent"
                        onClick={() => {
                          setNaOpen((o) => !o);
                          setAttentionReviewed(true);
                        }}
                      >
                        <TableCell
                          colSpan={4}
                          className="bg-warning/10 text-warning cursor-pointer py-2 text-xs font-bold tracking-wide"
                        >
                          <div className="flex items-center gap-1.5">
                            {naOpen ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                            NEEDS YOUR ATTENTION · {naCount}
                          </div>
                        </TableCell>
                      </TableRow>
                      {naOpen &&
                        needsAttention.map((n) => (
                          <TableRow
                            key={n.id}
                            className={cn(
                              'border-l-3',
                              n.blocking
                                ? 'border-l-destructive'
                                : 'border-l-warning',
                            )}
                          >
                            <TableCell className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {n.name}
                              </div>
                              <div className="text-muted-foreground truncate text-[11.5px] whitespace-normal">
                                {n.note}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <ArrowRight className="size-4" />
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate text-sm font-semibold">
                              {n.targetLabel}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {n.isCast && (
                                  <>
                                    <Button
                                      variant={
                                        n.blocking ? 'default' : 'secondary'
                                      }
                                      size="xs"
                                      onClick={() =>
                                        canUseTransforms
                                          ? openRulesModal(
                                              n.sourceField!,
                                              n.destKey,
                                              n.blocking,
                                            )
                                          : promptUpgrade(
                                              TRANSFORM_UPGRADE_MESSAGE,
                                            )
                                      }
                                    >
                                      {canUseTransforms ? <Zap /> : <Lock />}{' '}
                                      {n.blocking ? 'Map values' : 'Edit rule'}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() =>
                                        onMappingsChange(
                                          mappings.map((m) =>
                                            m.sourceField === n.sourceField
                                              ? { ...m, dismissed: true }
                                              : m,
                                          ),
                                        )
                                      }
                                    >
                                      {n.blocking ? 'Dismiss' : 'Looks good'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filtered.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-8" />
                      <TableHead>Destination</TableHead>
                      {showDirectionToggle && (
                        <TableHead className="w-40">Direction</TableHead>
                      )}
                      <TableHead className="w-20">Match</TableHead>
                      <TableHead className="w-[9.5rem]">
                        Update Policy
                      </TableHead>
                      <TableHead className="w-[8.5rem]">
                        On Conflict
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered
                      // Deliberately not sorted by match status: re-sorting on every
                      // toggle relocates the row out from under the user right as they
                      // pick a match key from the "Matched by" dropdown above, making the
                      // switch look like it didn't flip. The "Matched by" summary already
                      // surfaces which fields are matched, so keep table order stable.
                      .flatMap((m) => {
                        const sf = sourceFields.find(
                          (f) => f.key === m.sourceField,
                        );
                        const dests = Array.isArray(m.destField)
                          ? m.destField
                          : [m.destField];
                        return dests.map((dk) => {
                          const df = destFields.find((f) => f.key === dk);
                          const isMatch = m.matchDestKey === dk;
                          const ruleCount = (m.destRules?.[dk] || []).filter(
                            (r: unknown) =>
                              (r as Record<string, unknown>).enabled !== false,
                          ).length;
                          const compatible = areTypesCompatible(
                            sourceTypeOf(m),
                            df?.type,
                          );
                          const direction = m.direction ?? 'bidirectional';
                          const rowDirectionReadOnly =
                            typeof directionReadOnly === 'function'
                              ? directionReadOnly(m)
                              : directionReadOnly;
                          const isEditing =
                            editingPair?.sourceField === m.sourceField &&
                            editingPair?.destKey === dk;
                          const glowing =
                            glow?.sourceField === m.sourceField &&
                            glow?.destKey === dk
                              ? glow.stage
                              : null;
                          const onEmpty = m.destOnEmpty?.[dk] ?? 'none';
                          const updatePolicy =
                            m.destUpdatePolicy?.[dk] ?? 'always';
                          const conflictScope =
                            m.destConflictScope?.[dk] ?? 'field';
                          return (
                            <TableRow
                              key={`${m.sourceField}-${dk}`}
                              className={cn(!compatible && 'bg-warning/5')}
                            >
                              <TableCell className="min-w-0">
                                {isEditing ? (
                                  <FieldSelect
                                    fields={sourceFields}
                                    value={editDraft?.sourceField ?? ''}
                                    onChange={(v) =>
                                      setEditDraft((prev) =>
                                        prev
                                          ? { ...prev, sourceField: v }
                                          : prev,
                                      )
                                    }
                                    placeholder="Source field…"
                                    highlightRequired={sourceRequiredActive}
                                  />
                                ) : (
                                  <>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate text-sm font-semibold">
                                        {sf?.label ?? m.sourceField}
                                        {sourceRequiredActive &&
                                          sf?.required && (
                                            <span className="text-destructive ml-0.5">
                                              *
                                            </span>
                                          )}
                                      </span>
                                      <TypeChip type={sf?.type} />
                                    </div>
                                    <div className="text-muted-foreground mt-0 truncate font-mono text-[10px]">
                                      {m.sourceField}
                                    </div>
                                  </>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                <DirectionArrow
                                  direction={
                                    showDirectionToggle
                                      ? direction
                                      : 'forward_only'
                                  }
                                />
                              </TableCell>
                              <TableCell className="min-w-0">
                                {isEditing ? (
                                  <FieldSelect
                                    fields={destFields.filter(
                                      (f) => !f.readOnly,
                                    )}
                                    value={editDraft?.destKey ?? ''}
                                    onChange={(v) =>
                                      setEditDraft((prev) =>
                                        prev ? { ...prev, destKey: v } : prev,
                                      )
                                    }
                                    placeholder="Destination field…"
                                    highlightRequired={destRequiredActive}
                                  />
                                ) : (
                                  <div className="flex min-w-0 flex-nowrap items-center gap-2">
                                    <span className="truncate text-sm font-semibold">
                                      {df?.label ?? dk}
                                      {destRequiredActive && df?.required && (
                                        <span className="text-destructive ml-0.5">
                                          *
                                        </span>
                                      )}
                                    </span>
                                    {isMatch && (
                                      <Badge className="bg-primary/10 text-primary shrink-0 gap-1 whitespace-nowrap">
                                        <KeyRound className="size-2.5" /> Match
                                        field
                                        {matchMode === 'or' &&
                                          m.matchOrder != null &&
                                          ` · ${m.matchOrder}`}
                                      </Badge>
                                    )}
                                    {ruleCount > 0 && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0 gap-1 whitespace-nowrap"
                                      >
                                        <Zap className="size-2.5" /> {ruleCount}{' '}
                                        rule
                                        {ruleCount > 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                    {onEmpty !== 'none' && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0 gap-1 whitespace-nowrap"
                                      >
                                        {onEmpty === 'skip_record'
                                          ? 'Skip if empty'
                                          : `Default: ${m.destDefaults?.[dk] || '—'}`}
                                      </Badge>
                                    )}
                                    {updatePolicy !== 'always' && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0 gap-1 whitespace-nowrap"
                                      >
                                        {updatePolicy === 'create_only'
                                          ? 'Create only'
                                          : 'Fill if empty'}
                                      </Badge>
                                    )}
                                    {updatePolicy === 'fill_if_empty' &&
                                      conflictScope === 'record' && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-warning/10 text-warning shrink-0 gap-1 whitespace-nowrap"
                                        >
                                          Skips whole record on mismatch
                                        </Badge>
                                      )}
                                    <TypeChip type={df?.type} />
                                  </div>
                                )}
                                {!isEditing && (
                                  <div className="text-muted-foreground truncate font-mono text-[10px]">
                                    {dk}
                                  </div>
                                )}
                              </TableCell>
                              {showDirectionToggle && (
                                <TableCell>
                                  {rowDirectionReadOnly ? (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 whitespace-nowrap"
                                    >
                                      <ArrowLeftRight className="size-3" />
                                      {
                                        DIRECTION_OPTIONS.find(
                                          (o) => o.value === direction,
                                        )?.label
                                      }
                                    </Badge>
                                  ) : (
                                    <Select
                                      value={direction}
                                      onValueChange={(v) =>
                                        setDirection(
                                          m.sourceField,
                                          v as MappingDirection,
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        size="sm"
                                        className="h-8 w-full"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent align="start">
                                        {DIRECTION_OPTIONS.map((o) => (
                                          <SelectItem
                                            key={o.value}
                                            value={o.value}
                                          >
                                            {o.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                              )}
                              {isEditing ? (
                                <TableCell colSpan={4} className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      // Blurred until something actually changed, so
                                      // Save always means "apply my edit".
                                      disabled={
                                        !editDraft?.sourceField ||
                                        !editDraft?.destKey ||
                                        // Unchanged — nothing to apply.
                                        (editDraft.sourceField ===
                                          m.sourceField &&
                                          editDraft.destKey === dk) ||
                                        // Changing either end can collide with an
                                        // existing pair, not just the destination.
                                        isDuplicatePair(
                                          editDraft.sourceField,
                                          editDraft.destKey,
                                        )
                                      }
                                      onClick={() =>
                                        editDraft &&
                                        editMapping(
                                          {
                                            sourceField: m.sourceField,
                                            destKey: dk,
                                          },
                                          editDraft,
                                        )
                                      }
                                    >
                                      <Check /> Save
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      aria-label="Cancel edit"
                                      onClick={() => {
                                        setEditingPair(null);
                                        setEditDraft(null);
                                      }}
                                    >
                                      <X />
                                    </Button>
                                  </div>
                                </TableCell>
                              ) : (
                                <>
                                  <TableCell>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <label className="flex w-fit cursor-pointer items-center gap-2">
                                          {isMatch && (
                                            <KeyRound className="text-primary size-3.5 shrink-0" />
                                          )}
                                          <Switch
                                            checked={isMatch}
                                            onCheckedChange={() =>
                                              toggleMatch(m.sourceField, dk)
                                            }
                                            aria-label={
                                              isMatch
                                                ? 'Remove as match field'
                                                : 'Set as match field'
                                            }
                                          />
                                        </label>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        {isMatch
                                          ? 'This field is used to find existing records. Click to unset.'
                                          : 'Use this field to find existing records to update.'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={updatePolicy}
                                      onValueChange={(v) =>
                                        setUpdatePolicy(
                                          m.sourceField,
                                          dk,
                                          v as MappingUpdatePolicy,
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        size="sm"
                                        className="h-8 w-[9.5rem]"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent align="end">
                                        {UPDATE_POLICY_OPTIONS.map((o) => (
                                          <Tooltip key={o.value}>
                                            <TooltipTrigger asChild>
                                              <SelectItem value={o.value}>
                                                {o.label}
                                              </SelectItem>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="right"
                                              className="max-w-56"
                                            >
                                              {o.hint}
                                            </TooltipContent>
                                          </Tooltip>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={conflictScope}
                                      disabled={updatePolicy !== 'fill_if_empty'}
                                      onValueChange={(v) =>
                                        setConflictScope(
                                          m.sourceField,
                                          dk,
                                          v as 'field' | 'record',
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        size="sm"
                                        className="h-8 w-[8.5rem]"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent align="end">
                                        {CONFLICT_SCOPE_OPTIONS.map((o) => (
                                          <Tooltip key={o.value}>
                                            <TooltipTrigger asChild>
                                              <SelectItem value={o.value}>
                                                {o.label}
                                              </SelectItem>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="right"
                                              className="max-w-56"
                                            >
                                              {o.hint}
                                            </TooltipContent>
                                          </Tooltip>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant={
                                              ruleCount > 0
                                                ? 'secondary'
                                                : 'outline'
                                            }
                                            size="sm"
                                            className={cn(
                                              glowing === 'rule' && GLOW_CLASS,
                                            )}
                                            onClick={() => {
                                              if (!canUseTransforms) {
                                                promptUpgrade(
                                                  TRANSFORM_UPGRADE_MESSAGE,
                                                );
                                                return;
                                              }
                                              if (glowing === 'rule')
                                                setGlow(null);
                                              openRulesModal(m.sourceField, dk);
                                            }}
                                          >
                                            {!canUseTransforms ? (
                                              <Lock />
                                            ) : ruleCount > 0 ? (
                                              <Zap />
                                            ) : (
                                              <Plus />
                                            )}
                                            {ruleCount > 0
                                              ? `Edit Rule${ruleCount > 1 ? ` (${ruleCount})` : ''}`
                                              : 'Add Rule'}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          {!canUseTransforms
                                            ? "Field transform rules aren't available on your plan."
                                            : glowing === 'rule'
                                              ? 'This mapping just changed — check the rule still fits.'
                                              : ruleCount > 0
                                                ? 'Edit the transform rule applied before this field syncs.'
                                                : 'Add a rule to transform the value before it syncs.'}
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-muted-foreground"
                                            aria-label="Edit mapping"
                                            onClick={() => {
                                              setEditingPair({
                                                sourceField: m.sourceField,
                                                destKey: dk,
                                              });
                                              setEditDraft({
                                                sourceField: m.sourceField,
                                                destKey: dk,
                                              });
                                            }}
                                          >
                                            <Pencil />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          Change which fields this mapping
                                          connects
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            aria-label="Remove mapping"
                                            onClick={() =>
                                              remove(m.sourceField, dk)
                                            }
                                          >
                                            <X />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          Remove mapping
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          );
                        });
                      })}
                  </TableBody>
                </Table>
              )}

              {filtered.length === 0 && mapSearch && (
                <div className="text-muted-foreground p-7 text-center text-sm">
                  No fields match your search.
                </div>
              )}
              {pairRows.length === 0 &&
                !mapSearch &&
                naCount === 0 &&
                !autoMapping && (
                  <Card className="rounded-none border-0 shadow-none">
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                      <AlertCircleIcon className="text-muted-foreground size-5" />
                      <p className="text-muted-foreground text-sm">
                        No field mappings yet.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!canManualMap) {
                            promptUpgrade(MANUAL_MAPPING_UPGRADE_MESSAGE);
                            return;
                          }
                          setComposerPrefill(null);
                          setShowComposer(true);
                        }}
                      >
                        {canManualMap ? <Plus /> : <Lock />} Add mapping
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-xs">
              {pairRows.length} field{pairRows.length !== 1 ? 's' : ''} mapped
            </span>
            <span className="text-muted-foreground text-xs">
              Scroll or search to find a field
            </span>
          </div>
        </CardContent>
      </Card>

      {rulesModal && rulesMapping && rulesDestKey && (
        <RuleBuilderModal
          mapping={rulesMapping as import('@/types').FieldMapping}
          destKey={rulesDestKey}
          initialRules={rulesInit as import('@/lib/ruleEngine').Rule[]}
          sourceFields={sourceFields}
          destFields={destFields}
          onSave={(rules: unknown[]) =>
            saveRules(rulesModal.sourceKey, rulesDestKey, rules)
          }
          onClose={() => setRulesModal(null)}
          projectId={projectId}
          sourceObject={sourceObject}
        />
      )}

      {autoMapPreview && (
        <AutoMapReviewDialog
          preview={autoMapPreview}
          destFields={destFields}
          onCancel={() => setAutoMapPreview(null)}
          onApply={applyAutoMap}
        />
      )}

      {upgradeDialog}
    </div>
  );
}
