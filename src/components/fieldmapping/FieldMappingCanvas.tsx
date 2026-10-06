import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  AlertCircleIcon,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  HelpCircle,
  Filter,
  GripVertical,
  ListFilter,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
import CombineFieldsDialog from './CombineFieldsDialog';
import type { RequiredReason } from './EmptyValuePolicy';
import FieldSettingsDrawer, {
  type TargetDrawerSection,
} from './FieldSettingsDrawer';
import QuickFieldMapper from './QuickFieldMapper';
import ReadOnlyFieldsPanel from './ReadOnlyFieldsPanel';
import RuleBuilderModal from './RuleBuilderModal';
import type { ExcludeCondition } from '@/types/conditions';

import { associationsApi } from '@/api/associations';
import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
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
  classifyTypePair,
  matchFields,
  matchValueToOption,
  type MatchableField,
} from '@/lib/fieldMatching';
import { suggestCastRule, type Rule } from '@/lib/ruleEngine';
import { combineMappingName, type CombineConfig } from '@/lib/combineFields';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';

export function IconLegend({
  size = 'icon-sm',
  variant = 'outline',
  className,
}: {
  size?: 'icon-xs' | 'icon-sm' | 'icon';
  variant?: 'outline' | 'ghost';
  className?: string;
}) {
  const items: Array<{ icon: React.ReactNode; label: string }> = [
    {
      icon: <KeyRound className="text-primary size-3.5" />,
      label:
        'Match field — used to find existing records to update instead of creating duplicates.',
    },
    {
      icon: <Zap className="text-warning size-3.5" />,
      label: "Transform rule — converts the value before it's synced.",
    },
    {
      icon: <Lock className="text-muted-foreground size-3.5" />,
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
    {
      icon: <X className="text-destructive size-3.5" />,
      label:
        'Remove this mapping (unlinks source and destination fields without deleting either field).',
    },
  ];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          type="button"
          aria-label="What do these icons mean?"
          className={cn(
            'text-muted-foreground hover:text-foreground',
            size === 'icon-xs' && 'size-6 rounded-full p-0',
            className,
          )}
        >
          <HelpCircle className={size === 'icon-xs' ? 'size-3.5' : 'size-4'} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-xs">
        <ul className="space-y-2">
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
export type MappingUpdatePolicy = 'always' | 'create_only';

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
];

export interface MappingRow {
  sourceField: string;
  destField: string | string[];
  sourceType?: string;
  destType?: string;
  transformType?: string;
  transformConfig?: Record<string, unknown> | null;
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
  /** UI-only destinations added through the Manual Mapping dialog. They render
   * directly below active match fields and are never sent to the API. */
  manuallyAddedDestKeys?: string[];
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
    const remainingManualDestKeys = (m.manuallyAddedDestKeys ?? []).filter(
      (key) => key !== destKey,
    );
    return [
      {
        ...m,
        destField: remaining.length === 1 ? remaining[0] : remaining,
        destRules: restRules,
        destOnEmpty: restOnEmpty,
        destDefaults: restDefaults,
        destUpdatePolicy: restUpdatePolicy,
        ...(remainingManualDestKeys.length > 0
          ? { manuallyAddedDestKeys: remainingManualDestKeys }
          : {}),
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
    ...(source.key.startsWith('__cross_object__:')
      ? { direction: 'forward_only' as const }
      : {}),
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
  why?: string;
  targetLabel: string;
  isCast?: boolean;
  destKey: string;
  sourceField?: string;
  /** Rendered in destructive rather than warning colours, because ignoring it means the
   *  value is silently discarded at write time rather than merely being odd. */
  blocking?: boolean;
  actionType?: 'value_map' | 'cast' | 'open_drawer' | 'identifier';
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
    <Badge
      variant="secondary"
      size="xs"
      className="text-muted-foreground bg-muted/60 max-w-20 shrink-0 truncate border-0 font-mono text-[9px] font-normal tracking-wider uppercase"
      title={type.toLowerCase()}
    >
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
  mappedFieldKeys,
  className,
  'aria-label': ariaLabel,
}: {
  fields: FieldDef[];
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  /** Whether to surface `required` fields at all — false suppresses both the sort-to-top and
   *  the red asterisk (e.g. a ServiceTitan object on a one-way job, where nothing's required). */
  highlightRequired?: boolean;
  /** Optional list of field keys that are actively mapped in this job.
   *  When provided, surfaces a dedicated "Mapped in this Job" group at the top. */
  mappedFieldKeys?: string[];
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [insideDialog, setInsideDialog] = useState(false);
  // Required fields surface first so they're not buried in a long list.
  const sorted = highlightRequired
    ? [...fields].sort((a, b) => Number(!!b.required) - Number(!!a.required))
    : fields;
  const selected = fields.find((f) => f.key === value);

  const hasMappedGrouping = Boolean(
    mappedFieldKeys && mappedFieldKeys.length > 0,
  );
  const mappedSet = useMemo(
    () => new Set(mappedFieldKeys ?? []),
    [mappedFieldKeys],
  );

  const mappedFields = useMemo(
    () => (hasMappedGrouping ? sorted.filter((f) => mappedSet.has(f.key)) : []),
    [hasMappedGrouping, sorted, mappedSet],
  );

  const otherFields = useMemo(
    () =>
      hasMappedGrouping ? sorted.filter((f) => !mappedSet.has(f.key)) : sorted,
    [hasMappedGrouping, sorted, mappedSet],
  );

  const renderItem = (f: FieldDef) => (
    <CommandItem
      key={f.key}
      className="min-w-0 cursor-pointer px-2.5 py-1.5"
      value={`${f.label || f.key} ${f.key}`}
      onSelect={() => {
        onChange(f.key);
        setOpen(false);
      }}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="text-foreground truncate text-xs font-medium">
            {f.label || f.key}
          </span>
          {f.label && f.label !== f.key && (
            <span className="text-muted-foreground/60 truncate font-mono text-[10px]">
              ({f.key})
            </span>
          )}
          {highlightRequired && f.required && (
            <span className="text-destructive shrink-0 text-xs font-bold">
              *
            </span>
          )}
        </div>
        <TypeChip type={f.type} />
      </div>
      {f.key === value && (
        <Check className="text-primary ml-2 size-3.5 shrink-0" />
      )}
    </CommandItem>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setInsideDialog(
            !!triggerRef.current?.closest('[data-slot="dialog-content"]'),
          );
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            'h-8 w-full flex-1 justify-between rounded-xl text-xs font-normal',
            className,
          )}
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {selected ? selected.label || selected.key : placeholder}
            {highlightRequired && selected?.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="border-border max-h-(--radix-popover-content-available-height) w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden border p-0 shadow-lg sm:w-[420px]"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search fields…" className="h-9 text-xs" />
          <ScrollArea
            className="h-64 max-h-[calc(var(--radix-popover-content-available-height)-3rem)]"
            viewportClassName="[&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
            onWheelCapture={(event) => {
              if (!insideDialog || event.deltaY === 0) return;
              const viewport = event.currentTarget.querySelector<HTMLElement>(
                '[data-slot="scroll-area-viewport"]',
              );
              if (viewport) viewport.scrollTop += event.deltaY;
            }}
          >
            <CommandList className="max-h-none w-full max-w-full min-w-0">
              <CommandEmpty>No fields found.</CommandEmpty>
              {hasMappedGrouping ? (
                <>
                  {mappedFields.length > 0 && (
                    <CommandGroup
                      heading="Mapped in this Job"
                      className="w-full max-w-full min-w-0"
                    >
                      {mappedFields.map((f) => renderItem(f))}
                    </CommandGroup>
                  )}
                  {otherFields.length > 0 && (
                    <CommandGroup
                      heading="Other Available Object Fields"
                      className="w-full max-w-full min-w-0"
                    >
                      {otherFields.map((f) => renderItem(f))}
                    </CommandGroup>
                  )}
                </>
              ) : (
                <CommandGroup className="w-full max-w-full min-w-0">
                  {sorted.map((f) => renderItem(f))}
                </CommandGroup>
              )}
            </CommandList>
          </ScrollArea>
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
  /** Hide the repeated canvas heading when a parent workspace already provides it. */
  showHeading?: boolean;
  /** Optional host for rendering the canvas toolbar in a parent workspace header. */
  toolbarContainer?: HTMLElement | null;
  /** Control height for a toolbar rendered outside the canvas. */
  toolbarControlSize?: 'sm' | 'default';
  /**
   * When true (no mappings saved yet), Auto-map becomes the primary CTA and
   * Add mapping is rendered as an outline/secondary action. Reverts to normal
   * once any mapping exists. Pure UX hint — no logic or data changes.
   */
  isFirstTime?: boolean;
  /**
   * Whether changes are currently unsaved (dirty). When true, newly designated
   * identifiers keep their current row position to prevent disorienting layout
   * shifts. When false (saved), all identifiers move to the top of the table.
   */
  isDirty?: boolean;
  /** Job-level exclude conditions, checked against field names for skip badges/filters. */
  excludeConditions?: ExcludeCondition[];
  /** Callback when a field skip filter is added or updated from the field settings drawer. */
  onExcludeConditionsChange?: (conditions: ExcludeCondition[]) => void;
  /** Target field to focus/highlight from deep linking */
  targetField?: string;
  /** Specific section of the settings drawer to open for the target field */
  targetSection?: TargetDrawerSection;
  /** Callback to clear deep link parameters after focus */
  onClearTarget?: () => void;
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
  showHeading = true,
  toolbarContainer,
  toolbarControlSize = 'sm',
  isFirstTime = false,
  isDirty,
  excludeConditions = [],
  onExcludeConditionsChange,
  targetField,
  targetSection,
  onClearTarget,
}: FieldMappingCanvasProps) {
  const attentionSectionRef = useRef<HTMLDivElement>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showCombineComposer, setShowCombineComposer] = useState(false);
  const [editingCombineSource, setEditingCombineSource] = useState<
    string | null
  >(null);
  const [settingsDrawer, setSettingsDrawer] = useState<{
    sourceKey: string;
    destKey: string;
    targetSection?: TargetDrawerSection;
  } | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [rulesModal, setRulesModal] = useState<RulesModalRef | null>(null);
  const [showReadOnlyFields, setShowReadOnlyFields] = useState(false);
  const [editingPair, setEditingPair] = useState<PairRef | null>(null);
  const [editDraft, setEditDraft] = useState<PairRef | null>(null);
  const [glow, setGlow] = useState<GlowTarget | null>(null);
  const [naOpen, setNaOpen] = useState(false);
  const [attentionReviewed, setAttentionReviewed] = useState(false);
  const { confirm } = useConfirmDialog();

  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const effectiveDirty = isDirty !== undefined ? isDirty : hasLocalEdits;

  // Persisted match keys capture the baseline identifiers when saved or first loaded.
  const [persistedMatchKeys, setPersistedMatchKeys] = useState<Set<string>>(
    () => {
      const initial = new Set<string>();
      mappings.forEach((m) => {
        if (m.matchDestKey) {
          initial.add(`${m.sourceField}::${m.matchDestKey}`);
        }
      });
      return initial;
    },
  );

  const initialCapturedRef = useRef(false);
  useEffect(() => {
    if (!initialCapturedRef.current && mappings.length > 0) {
      const keys = new Set<string>();
      mappings.forEach((m) => {
        if (m.matchDestKey) {
          keys.add(`${m.sourceField}::${m.matchDestKey}`);
        }
      });
      setPersistedMatchKeys(keys);
      initialCapturedRef.current = true;
    }
  }, [mappings]);

  // Keys of rows newly added during this editing session
  const [newlyAddedKeys, setNewlyAddedKeys] = useState<Set<string>>(new Set());
  // Single key that was JUST added to trigger smooth scroll and pulse highlight
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  // Track open 3-dot dropdown menu to maintain smooth slide position while open
  const [openDropdownPair, setOpenDropdownPair] = useState<string | null>(null);

  // Snapshot of mappings prior to the latest auto-map run, enabling 1-click rollback
  const [lastAutoMapSnapshot, setLastAutoMapSnapshot] = useState<
    MappingRow[] | null
  >(null);
  // Source field keys introduced by the latest auto-map run for dedicated badging
  const [autoMappedSourceKeys, setAutoMappedSourceKeys] = useState<Set<string>>(
    new Set(),
  );
  // Banner notification for newly applied auto-map batch
  const [autoMapBanner, setAutoMapBanner] = useState<{
    count: number;
    previousCount: number;
  } | null>(null);

  // When saved or discarded (effectiveDirty becomes false), update the baseline match keys
  // and clear newly added keys so rows settle into canonical order.
  const prevDirtyRef = useRef(effectiveDirty);
  useEffect(() => {
    if (prevDirtyRef.current && !effectiveDirty) {
      const keys = new Set<string>();
      mappings.forEach((m) => {
        if (m.matchDestKey) {
          keys.add(`${m.sourceField}::${m.matchDestKey}`);
        }
      });
      setPersistedMatchKeys(keys);
      setNewlyAddedKeys(new Set());
      setLastAutoMapSnapshot(null);
      setAutoMappedSourceKeys(new Set());
      setAutoMapBanner(null);
      setHasLocalEdits(false);
    }
    prevDirtyRef.current = effectiveDirty;
  }, [effectiveDirty, mappings]);

  useEffect(() => {
    if (!justAddedKey) return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(`mapping-row-${justAddedKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    const clearHighlight = setTimeout(() => {
      setJustAddedKey(null);
    }, 2800);

    return () => {
      clearTimeout(timeout);
      clearTimeout(clearHighlight);
    };
  }, [justAddedKey]);

  const handledTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !targetField ||
      (sourceFields.length === 0 && destFields.length === 0)
    ) {
      return;
    }

    const targetKey = `${targetField}:${targetSection || 'all'}`;
    if (handledTargetRef.current === targetKey) {
      return;
    }
    handledTargetRef.current = targetKey;

    const normalizedTarget = targetField.toLowerCase().trim();

    // 1. Search existing mappings for matching field (source or destination)
    const matching = mappings.find((m) => {
      const srcMatch = m.sourceField?.toLowerCase() === normalizedTarget;
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      const destMatch = dests.some(
        (df) => df?.toLowerCase() === normalizedTarget,
      );
      return srcMatch || destMatch;
    });

    if (matching) {
      const dests = Array.isArray(matching.destField)
        ? matching.destField
        : [matching.destField];
      const matchedDest =
        dests.find((df) => df?.toLowerCase() === normalizedTarget) || dests[0];
      const pairKey = `${matching.sourceField}-${matchedDest}`;

      // Smooth scroll and pulse highlight
      setJustAddedKey(pairKey);

      // If a section is requested, open FieldSettingsDrawer
      if (targetSection) {
        setSettingsDrawer({
          sourceKey: matching.sourceField,
          destKey: matchedDest,
          targetSection,
        });
      }

      toast.info(
        `Focused on "${targetField}". Opened ${targetSection || 'settings'} to resolve sync issue.`,
      );
      onClearTarget?.();
    } else {
      // 2. Field is not mapped yet! Check if it is a known destination field or source field
      const isKnownDest = destFields.some(
        (f) => f.key.toLowerCase() === normalizedTarget,
      );
      const isKnownSrc = sourceFields.some(
        (f) => f.key.toLowerCase() === normalizedTarget,
      );

      if (isKnownDest || isKnownSrc) {
        setShowComposer(true);
        toast.warning(
          `Field "${targetField}" is required by ${destPlatform || 'the destination'}, but is not mapped yet. Add a mapping below to resolve the error.`,
        );
        onClearTarget?.();
      }
    }
  }, [
    targetField,
    targetSection,
    mappings,
    sourceFields,
    destFields,
    destPlatform,
    onClearTarget,
  ]);

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
  // Keep a stable base order for ordinary rows. The table applies its priority
  // per source→destination pair below, so a fanned-out source appears only once
  // for each destination and only its active match pair moves to the top.
  const mappingOrderRef = useRef(new Map<string, number>());
  const nextMappingOrderRef = useRef(0);
  const pairRows = useMemo(() => {
    const order = mappingOrderRef.current;
    const currentKeys = new Set(mappings.map((m) => m.sourceField));

    // Forget removed rows so a later re-add is treated as a new row and appears
    // at the end, while ordinary property-only updates retain their position.
    for (const key of order.keys()) {
      if (!currentKeys.has(key)) order.delete(key);
    }
    mappings.forEach((mapping) => {
      if (!order.has(mapping.sourceField)) {
        order.set(mapping.sourceField, nextMappingOrderRef.current++);
      }
    });

    return mappings
      .filter((m) => !isConstantRow(m))
      .slice()
      .sort(
        (a, b) =>
          (order.get(a.sourceField) ?? 0) - (order.get(b.sourceField) ?? 0),
      );
  }, [mappings]);

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

  const missingDefaultIssues: NeedsAttentionItem[] = mappings.flatMap((m) => {
    if (m.dismissed || isConstantRow(m)) return [];
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.flatMap((dk) => {
      const isMissingForward =
        m.destOnEmpty?.[dk] === 'default' && !m.destDefaults?.[dk]?.trim();
      const isMissingReverse =
        showDirectionToggle &&
        m.destReverseOnEmpty?.[dk] === 'default' &&
        !m.destReverseDefaults?.[dk]?.trim();
      if (!isMissingForward && !isMissingReverse) return [];
      const sf = sourceFields.find((f) => f.key === m.sourceField);
      const df = destFields.find((f) => f.key === dk);
      return [
        {
          id: `def-${m.sourceField}-${dk}`,
          name: sf?.label ?? m.sourceField,
          note: 'Fallback policy requires a default value',
          why: `This mapping is configured to use a default fallback value when "${sf?.label ?? m.sourceField}" is empty, but no default value was entered. Records with empty source values cannot be synced reliably.`,
          targetLabel: df?.label ?? dk,
          isCast: false,
          destKey: dk,
          sourceField: m.sourceField,
          blocking: true,
          actionType: 'open_drawer' as const,
        },
      ];
    });
  });

  const hasIdentifier = mappings.some((m) => Boolean(m.matchDestKey));
  const missingIdentifierIssue: NeedsAttentionItem[] =
    mappings.length >= 2 && !hasIdentifier
      ? [
          {
            id: 'missing-identifier',
            name: 'Primary Identifier',
            note: 'No record lookup key designated',
            why: 'Every sync job requires at least one primary identifier (such as Email, Phone, or ID) to look up existing records and update them instead of creating duplicates on every sync run.',
            targetLabel: 'Required for Record Lookup',
            isCast: false,
            destKey: '',
            sourceField: '',
            blocking: true,
            actionType: 'identifier' as const,
          },
        ]
      : [];

  const needsAttention: NeedsAttentionItem[] = [
    ...missingIdentifierIssue,
    ...missingDefaultIssues,
    ...typeIssues.map(
      ({ mapping: m, destKey, destField: df, issue, sourceType }) => {
        const sf = sourceFields.find((f) => f.key === m.sourceField);
        return {
          id: `tm-${m.sourceField}-${destKey}`,
          name: sf?.label ?? m.sourceField,
          note:
            issue === 'value_map'
              ? 'Destination only accepts allowed options from a fixed list'
              : `Type mismatch: ${sourceType ?? 'text'} → ${df?.type ?? 'text'}`,
          why:
            issue === 'value_map'
              ? `"${df?.label ?? destKey}" on the destination platform only accepts specific dropdown options. Raw values from "${sf?.label ?? m.sourceField}" will be rejected unless each value is mapped to a valid destination option.`
              : `"${sf?.label ?? m.sourceField}" provides a ${sourceType ?? 'text'} value, but "${df?.label ?? destKey}" expects a ${df?.type ?? 'text'}. Add a conversion rule to ensure data writes properly.`,
          targetLabel: df?.label ?? destKey,
          isCast: true,
          blocking: issue === 'value_map',
          sourceField: m.sourceField,
          destKey,
          actionType: (issue === 'value_map' ? 'value_map' : 'cast') as
            'value_map' | 'cast',
        };
      },
    ),
  ];

  const naCount = needsAttention.length;

  const revealAttention = useCallback(() => {
    setNaOpen(true);
    // The collapsible content needs one frame to open before its position can
    // be measured correctly. scrollIntoView scrolls both the field-list pane
    // and the outer page when needed.
    requestAnimationFrame(() => {
      attentionSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, []);

  // Ignore the initial empty state so the panel stays collapsed on first load.
  // A later increase in attention items still opens it, but does not flash.
  const prevNaCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevNaCountRef.current === null) {
      prevNaCountRef.current = naCount;
      return;
    }

    if (naCount > prevNaCountRef.current) {
      setAttentionReviewed(false);
      revealAttention();
    }
    prevNaCountRef.current = naCount;
  }, [naCount, revealAttention]);

  useEffect(() => {
    onAttentionReviewChange?.({ count: naCount, reviewed: attentionReviewed });
  }, [naCount, attentionReviewed, onAttentionReviewChange]);

  useEffect(() => {
    if (!scrollToAttentionSignal || naCount === 0) return;
    // The wizard's Next button can request the same reveal after validation
    // blocks, which also counts as an explicit review by the user.
    setAttentionReviewed(true);
    revealAttention();
  }, [scrollToAttentionSignal, naCount, revealAttention]);

  // The guided highlight is a nudge, not a modal — it gets out of the way on its
  // own if the user has moved on to something else.
  useEffect(() => {
    if (!glow) return;
    const timer = setTimeout(() => setGlow(null), GLOW_MS);
    return () => clearTimeout(timer);
  }, [glow]);

  const pairCount = pairRows.reduce((count, mapping) => {
    const dests = Array.isArray(mapping.destField)
      ? mapping.destField
      : [mapping.destField];
    return count + dests.length;
  }, 0);
  const readyCount = pairRows.reduce((count, m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return (
      count +
      dests.filter(
        (dk) =>
          !readOnlyKeys.has(dk) &&
          !typeIssues.some(
            (issue) =>
              issue.mapping.sourceField === m.sourceField &&
              issue.destKey === dk,
          ),
      ).length
    );
  }, 0);
  const totalRef = Math.max(requiredDest.length, pairCount, 1);
  const progress = Math.min(100, Math.round((readyCount / totalRef) * 100));

  const combineNames = new Map<string, string>();
  const usedCombineNames: string[] = mappings
    .filter((mapping) => mapping.transformType === 'combine')
    .map((mapping) =>
      (
        mapping.transformConfig as unknown as CombineConfig | null
      )?.name?.trim(),
    )
    .filter((name): name is string => Boolean(name));
  for (const mapping of mappings) {
    if (mapping.transformType !== 'combine') continue;
    const config = mapping.transformConfig as unknown as CombineConfig | null;
    if (!config?.components) continue;
    const name = combineMappingName(config, sourceFields, usedCombineNames);
    combineNames.set(mapping.sourceField, name);
    if (!config.name?.trim()) usedCombineNames.push(name);
  }

  const filtered = mapSearch
    ? pairRows.filter((m) => {
        const sl = (
          sourceFields.find((f) => f.key === m.sourceField)?.label ??
          combineNames.get(m.sourceField) ??
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
    : pairRows;

  // The table renders one entry per source→destination pair, including when a
  // source fans out to several destinations. Apply the priority at that same
  // level: active match pair, manually-added pair, then all remaining pairs.
  // The seen set is a final safeguard against a malformed duplicate mapping
  // ever creating two visible rows for the same pair.
  const filteredPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: Array<{
      mapping: MappingRow;
      destKey: string;
      baseOrder: number;
    }> = [];
    let nextBaseOrder = 0;

    filtered.forEach((mapping) => {
      const dests = Array.isArray(mapping.destField)
        ? mapping.destField
        : [mapping.destField];
      dests.forEach((destKey) => {
        const key = `${mapping.sourceField}::${destKey}`;
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push({
          mapping,
          destKey,
          baseOrder: nextBaseOrder++,
        });
      });
    });

    const priority = ({ mapping, destKey }: (typeof pairs)[number]) => {
      const pairKey = `${mapping.sourceField}::${destKey}`;
      // When changes are saved (effectiveDirty === false), all current match keys sort to the top.
      // While editing (effectiveDirty === true), only previously saved match keys sort to the top,
      // keeping newly toggled rows stable in their current positions without layout shift.
      const isTopPinned = effectiveDirty
        ? persistedMatchKeys.has(pairKey)
        : mapping.matchDestKey === destKey;

      if (isTopPinned) return 0;
      if (mapping.manuallyAddedDestKeys?.includes(destKey)) return 1;
      return 2;
    };

    return pairs.sort((a, b) => {
      const priorityDifference = priority(a) - priority(b);
      if (priorityDifference !== 0) return priorityDifference;

      // In OR mode, active rows follow the same order as the Matched by
      // summary. AND-mode matches retain their original base order.
      if (
        priority(a) === 0 &&
        a.mapping.matchOrder != null &&
        b.mapping.matchOrder != null &&
        a.mapping.matchOrder !== b.mapping.matchOrder
      ) {
        return a.mapping.matchOrder - b.mapping.matchOrder;
      }

      return a.baseOrder - b.baseOrder;
    });
  }, [filtered, effectiveDirty, persistedMatchKeys]);

  /** Any number of destinations can be match fields at once — see matchOrder on
   *  MappingRow for how AND ("must all agree") vs. OR ("try in order, first hit
   *  wins") is decided. Toggling one on never disturbs the others; a newly added
   *  field only gets an order number if the set is already in OR mode. */
  const setMatchActive = (
    sourceKey: string,
    destKey: string,
    active: boolean,
  ) => {
    const matchRows = mappings.filter((m) => m.matchDestKey);
    const isOrMode = matchRows.some((m) => m.matchOrder != null);
    const maxOrder = matchRows.reduce(
      (mx, m) => Math.max(mx, m.matchOrder ?? 0),
      0,
    );
    setHasLocalEdits(true);
    onMappingsChange(
      mappings.map((m) => {
        if (m.sourceField !== sourceKey) return m;
        if (!active) {
          if (m.matchDestKey !== destKey) return m;
          return { ...m, matchDestKey: null, matchOrder: null };
        }
        if (m.matchDestKey === destKey) return m;
        return {
          ...m,
          matchDestKey: destKey,
          // Replacing the selected destination for a fanned-out source keeps
          // that source's existing OR priority. A brand-new match joins last.
          matchOrder: isOrMode ? (m.matchOrder ?? maxOrder + 1) : null,
        };
      }),
    );
  };

  const toggleMatch = (sourceKey: string, destKey: string) => {
    const mapping = mappings.find((m) => m.sourceField === sourceKey);
    setMatchActive(sourceKey, destKey, mapping?.matchDestKey !== destKey);
  };

  /** Switches every currently-set match field between AND (matchOrder cleared
   *  on all of them) and OR (sequential order assigned in current array order). */
  const setMatchMode = (mode: 'and' | 'or') => {
    let next = 0;
    setHasLocalEdits(true);
    onMappingsChange(
      mappings.map((m) => {
        if (!m.matchDestKey) return m;
        next += 1;
        return { ...m, matchOrder: mode === 'or' ? next : null };
      }),
    );
  };

  const remove = (sourceKey: string, destKey: string) => {
    setHasLocalEdits(true);
    setNewlyAddedKeys((prev) => {
      const next = new Set(prev);
      next.delete(`${sourceKey}-${destKey}`);
      return next;
    });
    onMappingsChange(removeFrom(mappings, sourceKey, destKey));
  };

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
      wasManuallyAdded: row.manuallyAddedDestKeys?.includes(from.destKey),
      updatePolicy: row.destUpdatePolicy?.[from.destKey],
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
            ...(carried.wasManuallyAdded
              ? {
                  manuallyAddedDestKeys: Array.from(
                    new Set([...(m.manuallyAddedDestKeys ?? []), to.destKey]),
                  ),
                }
              : {}),
            ...(carried.updatePolicy
              ? {
                  destUpdatePolicy: {
                    ...(m.destUpdatePolicy || {}),
                    [to.destKey]: carried.updatePolicy,
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
    if (rows.length === 0) return;
    // Snapshot existing mappings for instant 1-click rollback
    setLastAutoMapSnapshot([...mappings]);

    const added: MappingRow[] = rows.map(({ source, dest }) =>
      newMappingRow(source, dest),
    );

    // Track which source keys were newly auto-mapped
    const newKeys = new Set(added.map((m) => m.sourceField));
    setAutoMappedSourceKeys(newKeys);

    // Also mark pairKeys as newlyAddedKeys for row highlight glow
    const newPairKeys = new Set(newlyAddedKeys);
    for (const m of added) {
      const dk = Array.isArray(m.destField) ? m.destField[0] : m.destField;
      newPairKeys.add(`${m.sourceField}-${dk}`);
    }
    setNewlyAddedKeys(newPairKeys);
    setHasLocalEdits(true);

    onMappingsChange([...mappings, ...added]);
    void enrichValueMapSuggestions(added);
    setAutoMapPreview(null);

    // Activate rollback banner notification
    setAutoMapBanner({
      count: added.length,
      previousCount: mappings.length,
    });

    const repaired = added.filter((m) => m.destRules).length;
    toast.success(
      `Auto-mapped ${added.length} field${added.length !== 1 ? 's' : ''}.` +
        (repaired > 0
          ? ` ${repaired} got a conversion rule to match the destination type.`
          : ''),
    );
  };

  const handleRollbackAutoMap = () => {
    if (!lastAutoMapSnapshot) return;
    const removedCount = autoMappedSourceKeys.size;
    onMappingsChange(lastAutoMapSnapshot);
    setLastAutoMapSnapshot(null);
    setAutoMappedSourceKeys(new Set());
    setAutoMapBanner(null);
    toast.info(
      `Auto-map reverted. Restored ${lastAutoMapSnapshot.length} previous mapping${lastAutoMapSnapshot.length !== 1 ? 's' : ''} (${removedCount} removed).`,
    );
  };

  const handleDismissAutoMapBanner = () => {
    setAutoMapBanner(null);
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

  const handleQuickMap = (source: FieldDef, dest: FieldDef) => {
    const nextMappings = mergeMappingPair(mappings, source, dest);
    const pairKey = `${source.key}-${dest.key}`;
    setNewlyAddedKeys((prev) => new Set(prev).add(pairKey));
    setJustAddedKey(pairKey);
    setHasLocalEdits(true);
    onMappingsChange(nextMappings);
    toast.success(
      `Mapped ${source.label || source.key} to ${dest.label || dest.key}.`,
    );
  };

  const handleQuickMapBatch = (
    pairs: Array<{ source: FieldDef; dest: FieldDef }>,
  ) => {
    if (!pairs.length) return;
    let nextMappings = mappings;
    const addedKeys = new Set<string>();

    for (const { source, dest } of pairs) {
      nextMappings = mergeMappingPair(nextMappings, source, dest);
      addedKeys.add(`${source.key}-${dest.key}`);
    }

    setNewlyAddedKeys((prev) => {
      const next = new Set(prev);
      addedKeys.forEach((k) => next.add(k));
      return next;
    });

    const lastPair = pairs[pairs.length - 1];
    setJustAddedKey(`${lastPair.source.key}-${lastPair.dest.key}`);
    setHasLocalEdits(true);
    onMappingsChange(nextMappings);

    if (pairs.length === 1) {
      toast.success(
        `Mapped ${pairs[0].source.label || pairs[0].source.key} to ${pairs[0].dest.label || pairs[0].dest.key}.`,
      );
    } else {
      toast.success(`Mapped ${pairs.length} field pairs successfully.`);
    }
  };

  const openSettingsDrawer = (
    sourceKey: string,
    destKey: string,
    targetSection?: TargetDrawerSection,
  ) => {
    setSettingsDrawer({ sourceKey, destKey, targetSection });
  };

  const handleSettingsSave = (payload: {
    sourceKey: string;
    destKey: string;
    rules: Rule[];
    onEmpty: OnEmptyPolicy;
    defaultValue: string;
    reverseOnEmpty?: OnEmptyPolicy;
    reverseDefaultValue?: string;
    updatePolicy: MappingUpdatePolicy;
    isMatch: boolean;
    excludeCondition?: ExcludeCondition | null;
  }) => {
    onMappingsChange(
      mappings.map((m) => {
        if (m.sourceField !== payload.sourceKey) return m;
        const nextDestRules = { ...(m.destRules || {}) };
        if (payload.rules.length > 0) {
          nextDestRules[payload.destKey] = payload.rules;
        } else {
          delete nextDestRules[payload.destKey];
        }

        const nextDestOnEmpty = { ...(m.destOnEmpty || {}) };
        const nextDestDefaults = { ...(m.destDefaults || {}) };
        if (payload.onEmpty && payload.onEmpty !== 'none') {
          nextDestOnEmpty[payload.destKey] = payload.onEmpty;
          if (payload.defaultValue) {
            nextDestDefaults[payload.destKey] = payload.defaultValue;
          } else {
            delete nextDestDefaults[payload.destKey];
          }
        } else {
          delete nextDestOnEmpty[payload.destKey];
          delete nextDestDefaults[payload.destKey];
        }

        const nextDestUpdatePolicy = { ...(m.destUpdatePolicy || {}) };
        if (payload.updatePolicy === 'create_only') {
          nextDestUpdatePolicy[payload.destKey] = 'create_only';
        } else {
          delete nextDestUpdatePolicy[payload.destKey];
        }

        let matchDestKey = m.matchDestKey;
        let matchOrder = m.matchOrder;
        if (payload.isMatch) {
          matchDestKey = payload.destKey;
        } else if (matchDestKey === payload.destKey) {
          matchDestKey = null;
          matchOrder = null;
        }

        return {
          ...m,
          destRules: nextDestRules,
          destOnEmpty: nextDestOnEmpty,
          destDefaults: nextDestDefaults,
          destUpdatePolicy: nextDestUpdatePolicy,
          matchDestKey,
          matchOrder,
          ...(payload.reverseOnEmpty !== undefined
            ? {
                destReverseOnEmpty: {
                  ...(m.destReverseOnEmpty || {}),
                  [payload.destKey]: payload.reverseOnEmpty,
                },
              }
            : {}),
          ...(payload.reverseDefaultValue !== undefined
            ? {
                destReverseDefaults: {
                  ...(m.destReverseDefaults || {}),
                  [payload.destKey]: payload.reverseDefaultValue,
                },
              }
            : {}),
        };
      }),
    );

    if (onExcludeConditionsChange && excludeConditions) {
      const withoutCurrent = excludeConditions.filter(
        (c) => c.field !== payload.sourceKey,
      );
      if (payload.excludeCondition) {
        onExcludeConditionsChange([
          ...withoutCurrent,
          payload.excludeCondition,
        ]);
      } else {
        onExcludeConditionsChange(withoutCurrent);
      }
    }
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
  // The encoded value is only an opaque Select id; the original keys are looked
  // up from this list on selection instead of being split apart. Field keys can
  // legally contain punctuation, so parsing a composite `source::destination`
  // value can silently update no mapping and leave the save payload unmatched.
  const matchOptionValue = (sourceField: string, destKey: string) =>
    JSON.stringify([sourceField, destKey]);
  const seenMatchOptions = new Set<string>();
  const matchOptions = mappings.flatMap((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.flatMap((destKey) => {
      const value = matchOptionValue(m.sourceField, destKey);
      if (seenMatchOptions.has(value)) return [];
      seenMatchOptions.add(value);
      return [{ sourceField: m.sourceField, destKey }];
    });
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
  const handleMatchDragEnd = (result: DropResult) => {
    if (matchMode !== 'or' || !result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = [...activeMatches];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const orderByMatch = new Map(
      reordered.map((match, index) => [
        matchOptionValue(match.sourceField, match.destKey),
        index + 1,
      ]),
    );

    onMappingsChange(
      mappings.map((mapping) => {
        if (!mapping.matchDestKey) return mapping;
        const matchOrder = orderByMatch.get(
          matchOptionValue(mapping.sourceField, mapping.matchDestKey),
        );
        return matchOrder == null ? mapping : { ...mapping, matchOrder };
      }),
    );
  };
  const totalFields = Math.max(requiredDest.length, pairCount);
  const toolbarIconSize = toolbarControlSize === 'default' ? 'icon' : 'icon-sm';
  const mappingToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-48 sm:w-56">
        <InputGroupAddon>
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          value={mapSearch}
          onChange={(e) => setMapSearch(e.target.value)}
          placeholder="Search fields…"
          className="h-8 text-xs"
        />
        {mapSearch && (
          <InputGroupAddon align="inline-end">
            <button
              type="button"
              onClick={() => setMapSearch('')}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="size-3" />
            </button>
          </InputGroupAddon>
        )}
      </InputGroup>

      {readOnlyDestFields.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showReadOnlyFields ? 'secondary' : 'outline'}
              size={toolbarControlSize}
              onClick={() => setShowReadOnlyFields((prev) => !prev)}
              aria-expanded={showReadOnlyFields}
              className={cn(
                'h-8 shrink-0 gap-1.5 text-xs transition-colors',
                showReadOnlyFields
                  ? 'bg-muted text-foreground border-border font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Lock className="size-3.5" />
              <span>Read-only</span>
              <Badge
                variant="secondary"
                size="xs"
                className="ml-0.5 text-[10px]"
              >
                {readOnlyDestFields.length}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {showReadOnlyFields
              ? 'Hide unmappable destination fields'
              : `Show the ${readOnlyDestFields.length} destination fields that can't be mapped to`}
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isFirstTime ? 'outline' : 'default'}
            size={toolbarControlSize}
            onClick={() => {
              if (!canManualMap) {
                promptUpgrade(MANUAL_MAPPING_UPGRADE_MESSAGE);
                return;
              }
              setShowComposer((p) => !p);
            }}
            className={cn(
              'h-8 shrink-0 gap-1.5 text-xs font-medium',
              !canManualMap && 'text-muted-foreground cursor-not-allowed',
            )}
          >
            {canManualMap ? (
              <Plus className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            <span>Add mapping</span>
          </Button>
        </TooltipTrigger>
        {!canManualMap && (
          <TooltipContent side="top">
            Your plan uses auto-mapped presets only — upgrade to add mappings by
            hand
          </TooltipContent>
        )}
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground size-8 shrink-0 p-0"
            aria-label="More mapping options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() => {
              if (!canUseTransforms) {
                promptUpgrade(TRANSFORM_UPGRADE_MESSAGE);
                return;
              }
              setShowCombineComposer(true);
            }}
            className="gap-2 text-xs"
          >
            {!canUseTransforms ? (
              <Lock className="text-muted-foreground size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            <span>Combine fields...</span>
          </DropdownMenuItem>
          {readOnlyDestFields.length > 0 && (
            <DropdownMenuItem
              onClick={() => setShowReadOnlyFields((prev) => !prev)}
              className="gap-2 text-xs"
            >
              <Lock className="text-muted-foreground size-3.5" />
              <span>
                {showReadOnlyFields ? 'Hide' : 'View'} unmappable fields (
                {readOnlyDestFields.length})
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
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
            className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
          >
            <Trash2 className="size-3.5" />
            <span>Clear all mappings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {toolbarContainer && createPortal(mappingToolbar, toolbarContainer)}
      {/* <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
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
              <Progress
                value={progress}
                className="h-1.5 max-w-xs min-w-24 flex-1"
              />

              {naCount > 0 ? (
                <Badge
                  variant="secondary"
                  size="xs"
                  className="gap-1.5"
                >
                  <AlertTriangle className="size-3 text-warning shrink-0" />
                  <span>{naCount} need attention</span>
                </Badge>
              ) : (
                pairRows.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="gap-1"
                  >
                    <Check className="size-3 text-success shrink-0" />
                    <span>All mapped</span>
                  </Badge>
                )
              )}
            </div>
            <Button
              onClick={handleAutoMapClick}
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              disabled={
                autoMapping ||
                sourceFields.length === 0 ||
                destFields.length === 0
              }
            >
              {autoMapping ? <Spinner /> : <Wand2 className="size-4" />}
              {autoMapping ? 'Auto-mapping…' : 'Auto-map'}
            </Button>
          </div>

          <Separator />

          <section className="px-4 py-3" aria-labelledby="matched-by-heading">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex shrink-0 items-center gap-1.5"
                title="Fields used to uniquely identify records and match them between platforms"
              >
                <KeyRound className="text-primary size-3.5" />
                <h3 id="matched-by-heading" className="text-xs font-semibold">
                  Identifier
                </h3>
              </div>

              {activeMatches.length >= 2 && (
                <div
                  className="bg-muted flex shrink-0 items-center rounded-xl p-0.5"
                  role="group"
                  aria-label="Identifier key behavior"
                >
                  <button
                    type="button"
                    className={cn(
                      'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
                      matchMode === 'and'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setMatchMode('and')}
                    title="All selected identifier keys must match"
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
                      matchMode === 'or'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setMatchMode('or')}
                    title="Try identifier keys in priority order; first match wins"
                  >
                    OR
                  </button>
                </div>
              )}

              <Select
                value=""
                onValueChange={(value) => {
                  const selected = addableMatchOptions.find(
                    (option) =>
                      matchOptionValue(option.sourceField, option.destKey) ===
                      value,
                  );
                  if (!selected) return;
                  setMatchActive(selected.sourceField, selected.destKey, true);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="ml-auto h-7 w-48 max-w-full"
                >
                  <SelectValue
                    placeholder={
                      activeMatches.length === 0 ? 'Choose identifier' : '+ Add identifier'
                    }
                  />
                </SelectTrigger>
                <SelectContent align="end">
                  {addableMatchOptions.length === 0 ? (
                    <div className="text-muted-foreground px-2.5 py-1.5 text-xs">
                      {matchOptions.length === 0
                        ? 'No fields mapped yet'
                        : 'All mapped fields already added as identifiers'}
                    </div>
                  ) : (
                    addableMatchOptions.map(({ sourceField, destKey }) => {
                      const field = sourceFields.find(
                        (f) => f.key === sourceField,
                      );
                      const destF = destFields.find((f) => f.key === destKey);
                      return (
                        <SelectItem
                          key={matchOptionValue(sourceField, destKey)}
                          value={matchOptionValue(sourceField, destKey)}
                          title={`Maps to ${destF?.label ?? destKey}`}
                        >
                          {field?.label ?? sourceField}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {activeMatches.length > 0 && (
              <DragDropContext onDragEnd={handleMatchDragEnd}>
                <Droppable droppableId="matched-by-keys" direction="horizontal">
                  {(dropProvided) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className="mt-2 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5"
                    >
                      {activeMatches.map((am, idx) => {
                        const field = sourceFields.find(
                          (f) => f.key === am.sourceField,
                        );
                        const canReorder =
                          matchMode === 'or' && activeMatches.length > 1;
                        return (
                          <Draggable
                            key={matchOptionValue(am.sourceField, am.destKey)}
                            draggableId={matchOptionValue(
                              am.sourceField,
                              am.destKey,
                            )}
                            index={idx}
                            isDragDisabled={!canReorder}
                          >
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                style={dragProvided.draggableProps.style}
                                className={cn(
                                  'bg-muted/40 flex h-8 max-w-56 shrink-0 items-center rounded-xl border text-xs',
                                  snapshot.isDragging &&
                                    'bg-background ring-ring shadow-md ring-2',
                                )}
                              >
                                {canReorder ? (
                                  <button
                                    type="button"
                                    {...dragProvided.dragHandleProps}
                                    className="text-muted-foreground hover:text-foreground flex h-full w-7 cursor-grab items-center justify-center border-r outline-none active:cursor-grabbing"
                                    aria-label={`Reorder ${field?.label ?? am.sourceField}`}
                                    title="Drag to change priority"
                                  >
                                    <GripVertical className="size-3.5" />
                                  </button>
                                ) : (
                                  <KeyRound className="text-muted-foreground ml-2 size-3 shrink-0" />
                                )}
                                {matchMode === 'or' && (
                                  <span className="text-primary pl-2 font-mono text-[10px] font-semibold">
                                    {idx + 1}
                                  </span>
                                )}
                                <span
                                  className="truncate px-2 font-medium"
                                  title={field?.label ?? am.sourceField}
                                >
                                  {field?.label ?? am.sourceField}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-destructive mr-0.5 shrink-0"
                                  onClick={() =>
                                    toggleMatch(am.sourceField, am.destKey)
                                  }
                                  aria-label="Remove match key"
                                  title="Remove key"
                                >
                                  <X />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        </CardContent>
      </Card> */}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Status: ready count + progress + badge */}
            <div className="flex shrink-0 items-center gap-2.5">
              <h3 className="text-sm font-bold whitespace-nowrap">
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
              <Progress value={progress} className="h-1.5 w-20 lg:w-24" />

              {naCount > 0 ? (
                <Badge
                  variant="secondary"
                  size="xs"
                  className="shrink-0 gap-1.5"
                >
                  <AlertTriangle className="text-warning size-3 shrink-0" />
                  <span>{naCount} need attention</span>
                </Badge>
              ) : (
                pairRows.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="shrink-0 gap-1"
                  >
                    <Check className="text-success size-3 shrink-0" />
                    <span>All mapped</span>
                  </Badge>
                )
              )}
            </div>

            <div className="bg-border hidden h-8 w-px shrink-0 lg:block" />

            {/* Matched by: flexes to fill remaining width, chips scroll if crowded */}
            <section
              className="flex min-w-0 flex-1 items-center gap-2"
              aria-labelledby="matched-by-heading"
            >
              <div
                className="flex shrink-0 items-center gap-1.5"
                title="Fields used to uniquely identify records and match them between platforms"
              >
                <KeyRound className="text-primary size-3.5" />
                <h3
                  id="matched-by-heading"
                  className="text-xs font-semibold whitespace-nowrap"
                >
                  Identifier
                </h3>
              </div>

              {activeMatches.length >= 2 && (
                <div
                  className="bg-muted flex h-7 shrink-0 items-center rounded-xl p-0.5"
                  role="group"
                  aria-label="Identifier key behavior"
                >
                  <button
                    type="button"
                    className={cn(
                      'h-6 rounded-lg px-2 text-[11px] font-semibold transition-colors',
                      matchMode === 'and'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setMatchMode('and')}
                    title="All selected identifier keys must match"
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'h-6 rounded-lg px-2 text-[11px] font-semibold transition-colors',
                      matchMode === 'or'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setMatchMode('or')}
                    title="Try identifier keys in priority order; first match wins"
                  >
                    OR
                  </button>
                </div>
              )}

              {activeMatches.length > 0 ? (
                <DragDropContext onDragEnd={handleMatchDragEnd}>
                  <Droppable
                    droppableId="matched-by-keys"
                    direction="horizontal"
                  >
                    {(dropProvided) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
                      >
                        {activeMatches.map((am, idx) => {
                          const field = sourceFields.find(
                            (f) => f.key === am.sourceField,
                          );
                          const canReorder =
                            matchMode === 'or' && activeMatches.length > 1;
                          return (
                            <Draggable
                              key={matchOptionValue(am.sourceField, am.destKey)}
                              draggableId={matchOptionValue(
                                am.sourceField,
                                am.destKey,
                              )}
                              index={idx}
                              isDragDisabled={!canReorder}
                            >
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={dragProvided.draggableProps.style}
                                  className={cn(
                                    'bg-muted/40 flex h-7 max-w-44 shrink-0 items-center rounded-xl border text-xs',
                                    snapshot.isDragging &&
                                      'bg-background ring-ring shadow-md ring-2',
                                  )}
                                >
                                  {canReorder ? (
                                    <button
                                      type="button"
                                      {...dragProvided.dragHandleProps}
                                      className="text-muted-foreground hover:text-foreground flex h-full w-6 cursor-grab items-center justify-center border-r outline-none active:cursor-grabbing"
                                      aria-label={`Reorder ${field?.label ?? am.sourceField}`}
                                      title="Drag to change priority"
                                    >
                                      <GripVertical className="size-3.5" />
                                    </button>
                                  ) : (
                                    <KeyRound className="text-muted-foreground ml-2 size-3 shrink-0" />
                                  )}
                                  {matchMode === 'or' && (
                                    <span className="text-primary pl-1.5 font-mono font-semibold">
                                      {idx + 1}
                                    </span>
                                  )}
                                  <span
                                    className="truncate px-1.5 font-medium"
                                    title={field?.label ?? am.sourceField}
                                  >
                                    {field?.label ?? am.sourceField}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-destructive mr-0.5 shrink-0"
                                    onClick={() =>
                                      toggleMatch(am.sourceField, am.destKey)
                                    }
                                    aria-label="Remove match key"
                                    title="Remove key"
                                  >
                                    <X />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <span className="text-muted-foreground shrink-0 text-xs italic">
                  No identifiers selected
                </span>
              )}

              <Select
                value=""
                onValueChange={(value) => {
                  const selected = addableMatchOptions.find(
                    (option) =>
                      matchOptionValue(option.sourceField, option.destKey) ===
                      value,
                  );
                  if (!selected) return;
                  setMatchActive(selected.sourceField, selected.destKey, true);
                }}
              >
                <SelectTrigger size="sm" className="w-36 shrink-0">
                  <SelectValue
                    placeholder={
                      activeMatches.length === 0
                        ? 'Choose identifier'
                        : '+ Add identifier'
                    }
                  />
                </SelectTrigger>
                <SelectContent align="end">
                  {addableMatchOptions.length === 0 ? (
                    <div className="text-muted-foreground px-2.5 py-1.5 text-xs">
                      {matchOptions.length === 0
                        ? 'No fields mapped yet'
                        : 'All mapped fields already added as identifiers'}
                    </div>
                  ) : (
                    addableMatchOptions.map(({ sourceField, destKey }) => {
                      const field = sourceFields.find(
                        (f) => f.key === sourceField,
                      );
                      const destF = destFields.find((f) => f.key === destKey);
                      return (
                        <SelectItem
                          key={matchOptionValue(sourceField, destKey)}
                          value={matchOptionValue(sourceField, destKey)}
                          title={`Maps to ${destF?.label ?? destKey}`}
                        >
                          {field?.label ?? sourceField}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </section>

            {/* Auto-map: pinned to the right on lg+, full-width row on mobile */}
            <Button
              variant={isFirstTime ? 'default' : 'outline'}
              onClick={handleAutoMapClick}
              size="sm"
              className="shrink-0"
              disabled={
                autoMapping ||
                sourceFields.length === 0 ||
                destFields.length === 0
              }
            >
              {autoMapping ? <Spinner /> : <Wand2 className="size-4" />}
              {autoMapping ? 'Auto-mapping…' : 'Auto-map'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReadOnlyFields && (
        <ReadOnlyFieldsPanel
          fields={readOnlyDestFields}
          platformLabel={PLATFORM_LABEL[destPlatform] ?? destPlatform}
          onClose={() => setShowReadOnlyFields(false)}
        />
      )}

      <Card className="bg-card border-border gap-0 overflow-hidden py-0 shadow-xs">
        <CardContent className="p-0">
          {toolbarContainer === undefined && (
            <div
              className={cn(
                'border-border bg-muted/30 dark:bg-card/90 flex flex-col gap-4 border-b px-5 py-4 xl:flex-row xl:items-center xl:justify-between',
                !showHeading && 'xl:justify-end',
              )}
            >
              {showHeading && (
                <div className="flex items-center gap-2">
                  <HeadingPair
                    title="Field mappings"
                    subtitle="Map fields between your connected platforms to keep data in sync."
                  />
                  <IconLegend size="icon-xs" variant="ghost" />
                </div>
              )}
              {mappingToolbar}
            </div>
          )}

          <CombineFieldsDialog
            open={showCombineComposer}
            onOpenChange={(open) => {
              setShowCombineComposer(open);
              if (!open) setEditingCombineSource(null);
            }}
            sourceFields={sourceFields}
            destinationFields={destFields}
            initial={
              editingCombineSource
                ? (() => {
                    const mapping = mappings.find(
                      (item) => item.sourceField === editingCombineSource,
                    );
                    return mapping
                      ? {
                          destinationField: Array.isArray(mapping.destField)
                            ? mapping.destField[0]
                            : mapping.destField,
                          config:
                            mapping.transformConfig as unknown as CombineConfig,
                        }
                      : null;
                  })()
                : null
            }
            onApply={(destinationField, config) => {
              const otherNames = [...combineNames.entries()]
                .filter(([source]) => source !== editingCombineSource)
                .map(([, name]) => name);
              const namedConfig = {
                ...config,
                name: combineMappingName(config, sourceFields, otherNames),
              };
              if (editingCombineSource) {
                onMappingsChange(
                  mappings.map((mapping) =>
                    mapping.sourceField === editingCombineSource
                      ? {
                          ...mapping,
                          destField: destinationField,
                          transformConfig: namedConfig as unknown as Record<
                            string,
                            unknown
                          >,
                          direction: 'forward_only',
                        }
                      : mapping,
                  ),
                );
                return;
              }
              const id =
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const pairKey = `__combine__:${id}-${destinationField}`;
              setNewlyAddedKeys((prev) => new Set(prev).add(pairKey));
              setJustAddedKey(pairKey);
              setHasLocalEdits(true);
              onMappingsChange([
                ...mappings,
                {
                  sourceField: `__combine__:${id}`,
                  destField: destinationField,
                  transformType: 'combine',
                  transformConfig: namedConfig as unknown as Record<
                    string,
                    unknown
                  >,
                  direction: 'forward_only',
                },
              ]);
            }}
          />
          <div className="bg-card overflow-hidden">
            <div className="bg-muted/40 dark:bg-muted/20 border-border flex items-center gap-2 border-b px-4 py-2.5">
              <div className="text-foreground/85 dark:text-foreground/80 flex min-w-0 flex-1 items-center gap-2 text-[11px] font-bold tracking-wide">
                <PlatformTile platformId={sourcePlatform} size={18} />
                {(
                  PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform
                ).toUpperCase()}
                {sourceObject && (
                  <Badge variant="secondary" size="xs">
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
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <div className="text-foreground/85 dark:text-foreground/80 flex min-w-0 flex-1 items-center gap-2 text-[11px] font-bold tracking-wide">
                <PlatformTile platformId={destPlatform} size={18} />
                {(PLATFORM_LABEL[destPlatform] ?? destPlatform).toUpperCase()}
                {destObject && (
                  <Badge variant="secondary" size="xs">
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

            {showComposer && (
              <div className="border-border bg-muted/10 border-b">
                <QuickFieldMapper
                  sourceFields={sourceFields}
                  destFields={destFields}
                  mappings={mappings}
                  onMap={handleQuickMap}
                  onMapBatch={handleQuickMapBatch}
                  onClose={() => setShowComposer(false)}
                  sourcePlatformLabel={
                    PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform
                  }
                  destPlatformLabel={
                    PLATFORM_LABEL[destPlatform] ?? destPlatform
                  }
                  readOnlyKeys={readOnlyKeys}
                />
              </div>
            )}

            {autoMapBanner && (
              <div className="border-primary/20 bg-primary/10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary size-4 shrink-0" />
                  <span className="text-foreground font-semibold">
                    Auto-mapped {autoMapBanner.count} field
                    {autoMapBanner.count !== 1 ? 's' : ''}.
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">
                    {autoMapBanner.previousCount > 0
                      ? `Your ${autoMapBanner.previousCount} previous mapping${autoMapBanner.previousCount !== 1 ? 's were' : ' was'} untouched.`
                      : 'Added as new mappings.'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    className="border-primary/30 text-primary hover:bg-primary/20 h-7 gap-1.5 text-xs font-semibold"
                    onClick={handleRollbackAutoMap}
                  >
                    <RotateCcw className="size-3.5" />
                    Undo Auto-Map
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground hover:text-foreground h-7 text-xs"
                    onClick={handleDismissAutoMapBanner}
                  >
                    Keep Mappings
                  </Button>
                </div>
              </div>
            )}

            <div>
              {autoMapping && (
                <div className="text-muted-foreground border-border flex items-center justify-center gap-3 border-b py-10 text-sm">
                  <Spinner />
                  Waiting for all fields to load, then matching them
                  automatically…
                </div>
              )}

              {naCount > 0 && !mapSearch && (
                <div
                  ref={attentionSectionRef}
                  className="border-border scroll-mt-28 border-b transition-shadow"
                >
                  <Table>
                    <TableBody>
                      <TableRow
                        className="hover:bg-warning/[0.08] border-border cursor-pointer border-b transition-colors"
                        onClick={() => {
                          setNaOpen((o) => !o);
                          setAttentionReviewed(true);
                        }}
                      >
                        <TableCell
                          colSpan={2}
                          className="bg-warning/[0.06] dark:bg-warning/[0.08] text-warning px-4 py-2.5 text-xs font-bold tracking-wide"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="text-warning size-4 shrink-0" />
                              <span>
                                NEEDS ATTENTION · {naCount}{' '}
                                {naCount === 1 ? 'ITEM' : 'ITEMS'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium opacity-90">
                              <span>
                                {naOpen
                                  ? 'Hide issues'
                                  : 'Show & resolve issues'}
                              </span>
                              {naOpen ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      {naOpen &&
                        needsAttention.map((n) => (
                          <TableRow
                            key={n.id}
                            className={cn(
                              'hover:bg-muted/30 bg-card border-border/70 border-b transition-colors',
                              n.blocking
                                ? 'bg-destructive/[0.04] dark:bg-destructive/[0.07]'
                                : 'bg-warning/[0.035] dark:bg-warning/[0.06]',
                            )}
                          >
                            <TableCell className="relative min-w-0 py-2.5 pl-4">
                              <div
                                className={cn(
                                  'absolute inset-y-0 left-0 w-1',
                                  n.blocking ? 'bg-destructive' : 'bg-warning',
                                )}
                                aria-hidden="true"
                              />
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-foreground text-sm font-semibold">
                                    {n.name}
                                  </span>
                                  {n.targetLabel &&
                                    n.targetLabel !== n.name && (
                                      <>
                                        <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                                        <span className="text-foreground text-sm font-semibold">
                                          {n.targetLabel}
                                        </span>
                                      </>
                                    )}
                                  <Badge
                                    variant="secondary"
                                    size="xs"
                                    className="shrink-0 gap-1"
                                  >
                                    <span
                                      className={cn(
                                        'size-1.5 shrink-0 rounded-full',
                                        n.blocking
                                          ? 'bg-destructive'
                                          : 'bg-warning',
                                      )}
                                    />
                                    <span
                                      className={
                                        n.blocking
                                          ? 'text-destructive font-medium'
                                          : 'text-warning font-medium'
                                      }
                                    >
                                      {n.blocking
                                        ? 'Action Required'
                                        : 'Recommendation'}
                                    </span>
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
                                  {n.why || n.note}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 pr-4 text-right align-middle">
                              <div className="flex shrink-0 items-center justify-end gap-2">
                                {n.actionType === 'value_map' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => {
                                      if (canUseTransforms) {
                                        if (n.sourceField) {
                                          const existing = mappings.find(
                                            (item) =>
                                              item.sourceField ===
                                              n.sourceField,
                                          );
                                          const existingRules = (existing
                                            ?.destRules?.[n.destKey] ??
                                            []) as Rule[];
                                          if (
                                            !existingRules.some(
                                              (r) =>
                                                r.type === 'value_map' ||
                                                r.type === 'value_mapping',
                                            )
                                          ) {
                                            saveRules(
                                              n.sourceField,
                                              n.destKey,
                                              [
                                                ...existingRules,
                                                {
                                                  type: 'value_map',
                                                  enabled: true,
                                                  map: {},
                                                  fallback: '',
                                                },
                                              ],
                                            );
                                          }
                                          openSettingsDrawer(
                                            n.sourceField,
                                            n.destKey,
                                            'transforms',
                                          );
                                        }
                                      } else {
                                        promptUpgrade(
                                          TRANSFORM_UPGRADE_MESSAGE,
                                        );
                                      }
                                    }}
                                  >
                                    {canUseTransforms ? (
                                      <Zap className="text-warning size-4" />
                                    ) : (
                                      <Lock className="size-4" />
                                    )}
                                    Map values
                                  </Button>
                                )}
                                {n.actionType === 'cast' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => {
                                      if (canUseTransforms) {
                                        if (n.sourceField) {
                                          openSettingsDrawer(
                                            n.sourceField,
                                            n.destKey,
                                            'transforms',
                                          );
                                        }
                                      } else {
                                        promptUpgrade(
                                          TRANSFORM_UPGRADE_MESSAGE,
                                        );
                                      }
                                    }}
                                  >
                                    {canUseTransforms ? (
                                      <Zap className="text-warning size-4" />
                                    ) : (
                                      <Lock className="size-4" />
                                    )}
                                    Edit rule
                                  </Button>
                                )}
                                {n.actionType === 'open_drawer' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() =>
                                      openSettingsDrawer(
                                        n.sourceField!,
                                        n.destKey,
                                        'fallbacks',
                                      )
                                    }
                                  >
                                    <Settings2 className="size-4" />
                                    Set default value
                                  </Button>
                                )}
                                {n.actionType === 'identifier' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => {
                                      const candidate =
                                        mappings.find((m) =>
                                          [
                                            'email',
                                            'id',
                                            'customer_id',
                                            'contact_id',
                                          ].some((k) =>
                                            m.sourceField
                                              .toLowerCase()
                                              .includes(k),
                                          ),
                                        ) || mappings[0];
                                      if (candidate) {
                                        const dk = Array.isArray(
                                          candidate.destField,
                                        )
                                          ? candidate.destField[0]
                                          : candidate.destField;
                                        toggleMatch(candidate.sourceField, dk);
                                        toast.success(
                                          `Set ${candidate.sourceField} as identifier.`,
                                        );
                                      }
                                    }}
                                  >
                                    <KeyRound className="size-4" />
                                    Use Recommended Identifier
                                  </Button>
                                )}
                                {n.isCast && !n.blocking && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground"
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
                                    Dismiss
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredPairs.length > 0 && (
                <Table className="bg-card min-w-[960px]">
                  <TableHeader className="bg-muted/50 dark:bg-muted/25 border-border border-b">
                    <TableRow className="border-border border-b hover:bg-transparent">
                      <TableHead className="text-foreground/80 dark:text-foreground/75 w-[34%] py-3 pr-2 pl-4 text-xs font-semibold tracking-wider uppercase">
                        Source field
                      </TableHead>
                      <TableHead className="text-foreground/80 dark:text-foreground/75 w-[34%] px-2 py-3 text-xs font-semibold tracking-wider uppercase">
                        Destination field
                      </TableHead>
                      {showDirectionToggle && (
                        <TableHead className="text-foreground/80 dark:text-foreground/75 w-28 px-2 py-3 text-xs font-semibold tracking-wider uppercase">
                          Direction
                        </TableHead>
                      )}
                      <TableHead className="text-foreground/80 dark:text-foreground/75 w-32 px-2 py-3 text-xs font-semibold tracking-wider uppercase">
                        Identifier
                      </TableHead>
                      <TableHead className="text-foreground/80 dark:text-foreground/75 py-3 pr-4 pl-2 text-right text-xs font-semibold tracking-wider uppercase">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPairs.map(({ mapping: m, destKey: dk }) => {
                      const sf = sourceFields.find(
                        (f) => f.key === m.sourceField,
                      );
                      const df = destFields.find((f) => f.key === dk);
                      const isMatch = m.matchDestKey === dk;
                      const rowRules = (m.destRules?.[dk] ||
                        (Array.isArray(m.rules) ? m.rules : []) ||
                        []) as Array<Record<string, unknown>>;
                      const ruleCount = rowRules.filter(
                        (r: unknown) =>
                          (r as Record<string, unknown>).enabled !== false,
                      ).length;
                      const rowAttentionIssues = needsAttention.filter(
                        (n) =>
                          n.sourceField === m.sourceField && n.destKey === dk,
                      );
                      const hasAttentionIssue = rowAttentionIssues.length > 0;
                      const hasBlockingIssue = rowAttentionIssues.some(
                        (n) => n.blocking,
                      );
                      const primaryIssue = rowAttentionIssues[0];
                      const direction = m.direction ?? 'bidirectional';
                      const rowDirectionReadOnly =
                        m.transformType === 'combine' ||
                        m.sourceField.startsWith('__cross_object__:') ||
                        (typeof directionReadOnly === 'function'
                          ? directionReadOnly(m)
                          : directionReadOnly);
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
                        m.destUpdatePolicy?.[dk] === 'create_only'
                          ? 'create_only'
                          : 'always';
                      const pairKey = `${m.sourceField}-${dk}`;
                      const isJustAdded = justAddedKey === pairKey;
                      const isNewlyAdded = newlyAddedKeys.has(pairKey);
                      const isAutoMapped = autoMappedSourceKeys.has(
                        m.sourceField,
                      );
                      const isNewlySetIdentifier =
                        isMatch &&
                        effectiveDirty &&
                        !persistedMatchKeys.has(`${m.sourceField}::${dk}`);
                      return (
                        <TableRow
                          key={pairKey}
                          id={`mapping-row-${pairKey}`}
                          className={cn(
                            'group/row hover:bg-muted/30 border-border/70 bg-card border-b transition-all duration-300',
                            hasAttentionIssue &&
                              (hasBlockingIssue
                                ? 'bg-destructive/[0.04] dark:bg-destructive/[0.07]'
                                : 'bg-warning/[0.035] dark:bg-warning/[0.06]'),
                            isJustAdded &&
                              'ring-primary/40 bg-primary/10 shadow-xs ring-2',
                            isAutoMapped &&
                              'bg-primary/[0.025] dark:bg-primary/[0.04]',
                          )}
                        >
                          {/* Column 1: Source Field (with Direction Arrow pointing to Destination) */}
                          <TableCell className="relative min-w-0 py-2 pr-2 pl-4 align-middle">
                            {hasAttentionIssue && (
                              <div
                                className={cn(
                                  'absolute inset-y-0 left-0 w-1',
                                  hasBlockingIssue
                                    ? 'bg-destructive'
                                    : 'bg-warning',
                                )}
                                aria-hidden="true"
                              />
                            )}
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-0.5">
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
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <span className="truncate text-sm font-semibold">
                                        {m.transformType === 'combine'
                                          ? (combineNames.get(m.sourceField) ??
                                            'Combined fields')
                                          : (sf?.label ?? m.sourceField)}
                                        {sourceRequiredActive &&
                                          sf?.required && (
                                            <span className="text-destructive ml-0.5">
                                              *
                                            </span>
                                          )}
                                      </span>
                                      {isAutoMapped ? (
                                        <Badge
                                          variant="secondary"
                                          size="xs"
                                          className="border-0 bg-primary/10 text-primary gap-1 font-medium"
                                        >
                                          <Sparkles className="text-primary size-2.5 shrink-0" />
                                          <span>Auto-mapped</span>
                                        </Badge>
                                      ) : isNewlyAdded ? (
                                        <Badge
                                          variant="secondary"
                                          size="xs"
                                          className="border-0 bg-primary/15 text-primary font-semibold"
                                        >
                                          New
                                        </Badge>
                                      ) : null}
                                      {m.transformType === 'combine' && (
                                        <Badge
                                          variant="secondary"
                                          size="xs"
                                          className="border-0 bg-muted/60 text-muted-foreground font-medium"
                                        >
                                          Combined
                                        </Badge>
                                      )}
                                      <TypeChip type={sf?.type} />
                                    </div>
                                    <div className="text-muted-foreground truncate font-mono text-[10px]">
                                      {m.transformType === 'combine'
                                        ? ((
                                            m.transformConfig as
                                              CombineConfig | undefined
                                          )?.components
                                            .filter(
                                              (component) =>
                                                component.type === 'field',
                                            )
                                            .map(
                                              (component) =>
                                                sourceFields.find(
                                                  (field) =>
                                                    field.key ===
                                                    component.value,
                                                )?.label ?? component.value,
                                            )
                                            .join(' + ') ?? m.sourceField)
                                        : m.sourceField.includes(
                                              '__cross_object__:',
                                            )
                                          ? 'Imported Property'
                                          : m.sourceField}
                                    </div>
                                  </>
                                )}
                              </div>
                              <DirectionArrow
                                direction={
                                  showDirectionToggle
                                    ? direction
                                    : 'forward_only'
                                }
                              />
                            </div>
                          </TableCell>

                          {/* Column 2: Destination Field */}
                          <TableCell className="min-w-0 py-2 px-2 align-middle">
                            {isEditing ? (
                              <FieldSelect
                                fields={destFields.filter((f) => !f.readOnly)}
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
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className="truncate text-sm font-semibold">
                                    {df?.label ?? dk}
                                    {destRequiredActive && df?.required && (
                                      <span className="text-destructive ml-0.5">
                                        *
                                      </span>
                                    )}
                                  </span>
                                  {ruleCount > 0 && (
                                    <Badge
                                      variant="secondary"
                                      size="xs"
                                      className="border-0 bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer gap-1 font-medium"
                                      onClick={() =>
                                        openSettingsDrawer(
                                          m.sourceField,
                                          dk,
                                          'transforms',
                                        )
                                      }
                                      title="View and edit transform rules"
                                    >
                                      <Zap className="size-2.5 shrink-0 text-primary" />
                                      <span>{ruleCount > 1 ? `${ruleCount} Rules` : 'Rule'}</span>
                                    </Badge>
                                  )}
                                  {onEmpty !== 'none' && (
                                    <Badge
                                      variant="secondary"
                                      size="xs"
                                      className="border-0 bg-muted/60 text-muted-foreground hover:bg-muted/80 shrink-0 cursor-pointer gap-1 font-normal"
                                      onClick={() =>
                                        openSettingsDrawer(
                                          m.sourceField,
                                          dk,
                                          'fallbacks',
                                        )
                                      }
                                      title="Configure empty value policy & fallback"
                                    >
                                      <span>
                                        {onEmpty === 'skip_record'
                                          ? 'Skip if empty'
                                          : `Default: "${m.destDefaults?.[dk] || '—'}"`}
                                      </span>
                                    </Badge>
                                  )}
                                  {excludeConditions?.some(
                                    (c) => c.field === m.sourceField,
                                  ) && (
                                    <Badge
                                      variant="secondary"
                                      size="xs"
                                      className="border-0 bg-warning/15 text-warning-foreground hover:bg-warning/25 shrink-0 cursor-pointer gap-1 font-normal"
                                      onClick={() =>
                                        openSettingsDrawer(
                                          m.sourceField,
                                          dk,
                                          'skips',
                                        )
                                      }
                                      title="Edit field filter condition"
                                    >
                                      <Filter className="text-warning size-2.5 shrink-0" />
                                      <span>Filter</span>
                                    </Badge>
                                  )}
                                  <TypeChip type={df?.type} />
                                </div>
                                <div className="text-muted-foreground truncate font-mono text-[10px]">
                                  {dk}
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* Column 3: Direction (if bidirectional) */}
                          {showDirectionToggle && (
                            <TableCell className="w-28 py-2 px-2 align-middle">
                              {rowDirectionReadOnly ? (
                                <Badge
                                  variant="secondary"
                                  size="xs"
                                  className="border-0 bg-muted/60 text-muted-foreground gap-1 whitespace-nowrap"
                                >
                                  <ArrowLeftRight className="text-muted-foreground size-3" />
                                  <span>
                                    {
                                      DIRECTION_OPTIONS.find(
                                        (o) => o.value === direction,
                                      )?.label
                                    }
                                  </span>
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
                                    className="bg-muted/20 border-border/40 hover:bg-muted/30 h-8 w-full text-xs"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent align="start">
                                    {DIRECTION_OPTIONS.map((o) => (
                                      <SelectItem
                                        key={o.value}
                                        value={o.value}
                                        className="text-xs"
                                      >
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          )}

                          {/* Column 4: Identifier */}
                          <TableCell className="w-32 py-2 px-2 align-middle">
                            {!isEditing &&
                              (isMatch ? (
                                <Badge
                                  variant="secondary"
                                  size="xs"
                                  className="border-0 bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer gap-1.5 font-medium"
                                  onClick={() => toggleMatch(m.sourceField, dk)}
                                  title={
                                    isNewlySetIdentifier
                                      ? 'Identifier match key (will move to top on save) — click to unset'
                                      : 'Identifier match key (click to unset)'
                                  }
                                >
                                  <KeyRound className="text-primary size-3 shrink-0" />
                                  <span>
                                    Identifier
                                    {matchMode === 'or' &&
                                      m.matchOrder != null &&
                                      ` #${m.matchOrder}`}
                                  </span>
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 border-border/70 hover:border-primary/40 h-7.5 shrink-0 cursor-pointer gap-1.5 rounded-lg border border-dashed px-2 text-xs font-medium opacity-0 transition-opacity group-hover/row:opacity-100"
                                  onClick={() => toggleMatch(m.sourceField, dk)}
                                  title="Set as identifier match key (will move to top on save)"
                                >
                                  <KeyRound className="size-3.5" />
                                  Set Identifier
                                </Button>
                              ))}
                          </TableCell>

                          {/* Column 7: Actions */}
                          <TableCell className="relative py-2 pr-4 pl-2 text-right align-middle whitespace-nowrap overflow-hidden">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={
                                    !editDraft?.sourceField ||
                                    !editDraft?.destKey ||
                                    (editDraft.sourceField === m.sourceField &&
                                      editDraft.destKey === dk) ||
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
                                  <Check className="size-4" /> Save
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
                                  <X className="size-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="relative flex items-center justify-end">
                                {/* 3-dots Dropdown Trigger: anchored at far right, smoothly revealed when front buttons slide left */}
                                <div className="absolute right-0 flex items-center justify-center">
                                  <DropdownMenu
                                    open={openDropdownPair === pairKey}
                                    onOpenChange={(open) =>
                                      setOpenDropdownPair(
                                        open ? pairKey : null,
                                      )
                                    }
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className={cn(
                                          'text-muted-foreground hover:text-foreground hover:bg-muted/70 flex size-7 cursor-pointer items-center justify-center rounded-lg outline-none transition-all duration-200 ease-out',
                                          'opacity-0 group-hover/row:opacity-100',
                                          openDropdownPair === pairKey &&
                                            'opacity-100',
                                        )}
                                        aria-label="More row options"
                                      >
                                        <MoreVertical className="size-4 shrink-0 transition-colors" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-52"
                                    >
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openSettingsDrawer(
                                            m.sourceField,
                                            dk,
                                            'all',
                                          )
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <Settings2 className="text-primary size-3.5" />
                                        <span>Field Settings</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() =>
                                          openSettingsDrawer(
                                            m.sourceField,
                                            dk,
                                            'transforms',
                                          )
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <Zap className="text-warning size-3.5" />
                                        <span>Transform Rules</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() =>
                                          openSettingsDrawer(
                                            m.sourceField,
                                            dk,
                                            'fallbacks',
                                          )
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <Settings2 className="text-muted-foreground size-3.5" />
                                        <span>Default Values</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() =>
                                          openSettingsDrawer(
                                            m.sourceField,
                                            dk,
                                            'skips',
                                          )
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <Filter className="text-primary size-3.5" />
                                        <span>Skip Conditions</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        onClick={() =>
                                          toggleMatch(m.sourceField, dk)
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <KeyRound className="text-primary size-3.5" />
                                        <span>
                                          {isMatch
                                            ? 'Unset Identifier'
                                            : 'Set as Identifier'}
                                        </span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() =>
                                          setUpdatePolicy(
                                            m.sourceField,
                                            dk,
                                            updatePolicy === 'create_only'
                                              ? 'always'
                                              : 'create_only',
                                          )
                                        }
                                        className="gap-2 text-xs"
                                      >
                                        <ArrowRight className="size-3.5" />
                                        <span>
                                          {updatePolicy === 'create_only'
                                            ? 'Policy: Overwrite'
                                            : 'Policy: Create Only'}
                                        </span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
                                        onClick={() => remove(m.sourceField, dk)}
                                      >
                                        <X className="size-3.5" />
                                        <span>Remove Mapping</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Front action buttons: smooth 28px slide-to-reveal on row hover */}
                                <div
                                  className={cn(
                                    'flex items-center gap-1.5 transition-transform duration-200 ease-out',
                                    'group-hover/row:-translate-x-7',
                                    openDropdownPair === pairKey &&
                                      '-translate-x-7',
                                  )}
                                >
                                  {hasAttentionIssue && primaryIssue ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={
                                        hasBlockingIssue
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="gap-1.5 border-0"
                                      onClick={() => {
                                        if (
                                          primaryIssue.actionType === 'value_map'
                                        ) {
                                          if (canUseTransforms) {
                                            const existingRules = (m.destRules?.[
                                              dk
                                            ] ?? []) as Rule[];
                                            if (
                                              !existingRules.some(
                                                (r) =>
                                                  r.type === 'value_map' ||
                                                  r.type === 'value_mapping',
                                              )
                                            ) {
                                              saveRules(m.sourceField, dk, [
                                                ...existingRules,
                                                {
                                                  type: 'value_map',
                                                  enabled: true,
                                                  map: {},
                                                  fallback: '',
                                                },
                                              ]);
                                            }
                                            openSettingsDrawer(
                                              m.sourceField,
                                              dk,
                                              'transforms',
                                            );
                                          } else {
                                            promptUpgrade(
                                              TRANSFORM_UPGRADE_MESSAGE,
                                            );
                                          }
                                        } else if (
                                          primaryIssue.actionType === 'cast'
                                        ) {
                                          if (canUseTransforms) {
                                            openSettingsDrawer(
                                              m.sourceField,
                                              dk,
                                              'transforms',
                                            );
                                          } else {
                                            promptUpgrade(
                                              TRANSFORM_UPGRADE_MESSAGE,
                                            );
                                          }
                                        } else {
                                          openSettingsDrawer(
                                            m.sourceField,
                                            dk,
                                            primaryIssue.actionType ===
                                              'open_drawer'
                                              ? 'fallbacks'
                                              : 'transforms',
                                          );
                                        }
                                      }}
                                      title={
                                        primaryIssue.why || primaryIssue.note
                                      }
                                    >
                                      <AlertTriangle
                                        className={cn(
                                          'size-4 shrink-0',
                                          hasBlockingIssue
                                            ? 'text-destructive-foreground'
                                            : 'text-warning',
                                        )}
                                      />
                                      <span>
                                        {primaryIssue.actionType === 'value_map'
                                          ? 'Map values'
                                          : primaryIssue.actionType ===
                                              'open_drawer'
                                            ? 'Set default'
                                            : 'Action required'}
                                      </span>
                                    </Button>
                                  ) : ruleCount > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          className={cn(
                                            'h-8 gap-1.5 border-0 text-xs font-medium',
                                            glowing === 'rule' && GLOW_CLASS,
                                          )}
                                          onClick={() => {
                                            if (glowing === 'rule')
                                              setGlow(null);
                                            openSettingsDrawer(
                                              m.sourceField,
                                              dk,
                                              'transforms',
                                            );
                                          }}
                                          title="Edit field settings and rules"
                                        >
                                          {!canUseTransforms ? (
                                            <Lock className="text-muted-foreground size-3.5" />
                                          ) : (
                                            <Zap className="text-warning size-3.5" />
                                          )}
                                          <span>{`Rule${ruleCount > 1 ? ` (${ruleCount})` : ''}`}</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        {!canUseTransforms
                                          ? "Field transform rules aren't available on your plan."
                                          : glowing === 'rule'
                                            ? 'This mapping just changed — check the rule still fits.'
                                            : 'Edit the transform rule applied before this field syncs.'}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className={cn(
                                            'h-8 gap-1.5 text-xs font-medium',
                                            glowing === 'rule' && GLOW_CLASS,
                                          )}
                                          onClick={() => {
                                            if (glowing === 'rule')
                                              setGlow(null);
                                            openSettingsDrawer(
                                              m.sourceField,
                                              dk,
                                              'transforms',
                                            );
                                          }}
                                          title="Add field transform rule"
                                        >
                                          {!canUseTransforms ? (
                                            <Lock className="text-muted-foreground size-3.5" />
                                          ) : (
                                            <Plus className="size-3.5" />
                                          )}
                                          <span>Add Rule</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        {!canUseTransforms
                                          ? "Field transform rules aren't available on your plan."
                                          : 'Add a rule to transform the value before it syncs.'}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-xs"
                                        className="border-border/80 bg-background text-muted-foreground hover:border-foreground/50 hover:text-foreground hover:bg-muted/30 size-7 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
                                        onClick={() => {
                                          if (m.transformType === 'combine') {
                                            setEditingCombineSource(
                                              m.sourceField,
                                            );
                                            setShowCombineComposer(true);
                                            return;
                                          }
                                          setEditingPair({
                                            sourceField: m.sourceField,
                                            destKey: dk,
                                          });
                                          setEditDraft({
                                            sourceField: m.sourceField,
                                            destKey: dk,
                                          });
                                        }}
                                        aria-label="Change fields"
                                        title="Change fields"
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      Change fields
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-xs"
                                        className="border-destructive/40 bg-background text-destructive hover:border-destructive hover:bg-destructive/10 size-7 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
                                        onClick={() => remove(m.sourceField, dk)}
                                        aria-label="Remove mapping"
                                        title="Remove mapping"
                                      >
                                        <X className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      Remove mapping
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
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

          <div className="border-border bg-muted/20 dark:bg-card flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-xs font-medium">
              {pairCount} field{pairCount !== 1 ? 's' : ''} mapped
            </span>
            <span className="text-muted-foreground text-xs">
              Scroll or search to find a field
            </span>
          </div>
        </CardContent>
      </Card>

      <FieldSettingsDrawer
        open={Boolean(settingsDrawer)}
        onOpenChange={(open) => {
          if (!open) setSettingsDrawer(null);
        }}
        mapping={
          settingsDrawer
            ? (mappings.find(
                (m) => m.sourceField === settingsDrawer.sourceKey,
              ) ?? null)
            : null
        }
        destKey={settingsDrawer?.destKey ?? null}
        sourceFieldDef={sourceFields.find(
          (f) => f.key === settingsDrawer?.sourceKey,
        )}
        destFieldDef={destFields.find((f) => f.key === settingsDrawer?.destKey)}
        isTwoWay={showDirectionToggle}
        canUseTransforms={canUseTransforms}
        promptUpgrade={promptUpgrade}
        excludeCondition={excludeConditions?.find(
          (c) => c.field === settingsDrawer?.sourceKey,
        )}
        targetSection={settingsDrawer?.targetSection}
        projectId={projectId}
        sourceObject={sourceObject}
        onSave={handleSettingsSave}
      />

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
