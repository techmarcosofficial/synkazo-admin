import {
  AlertCircle,
  Info,
  Plus,
  SearchCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import { FieldSelect, type FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { ConditionOperator, ExcludeCondition } from '@/types/conditions';

/** Copied from AssociationConditionsEditor.tsx rather than shared — the two editors
 *  happen to operate on the same condition shape today, but are independent features
 *  (this one gates whether a record syncs at all; that one gates whether an association
 *  is created) and are free to diverge without an injection seam holding them together. */
const OPERATORS: Array<{
  value: ConditionOperator;
  label: string;
  needsValue: boolean;
  multiValue?: boolean;
}> = [
  { value: 'equals', label: 'Equals', needsValue: true },
  { value: 'not_equals', label: 'Not equals', needsValue: true },
  { value: 'is_empty', label: 'Is empty', needsValue: false },
  { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  { value: 'contains', label: 'Contains', needsValue: true },
  { value: 'not_contains', label: 'Does not contain', needsValue: true },
  { value: 'starts_with', label: 'Starts with', needsValue: true },
  { value: 'ends_with', label: 'Ends with', needsValue: true },
  {
    value: 'in',
    label: 'In (comma-separated)',
    needsValue: true,
    multiValue: true,
  },
  {
    value: 'not_in',
    label: 'Not in (comma-separated)',
    needsValue: true,
    multiValue: true,
  },
  { value: 'gt', label: 'Greater than', needsValue: true },
  { value: 'gte', label: 'Greater than or equal to', needsValue: true },
  { value: 'lt', label: 'Less than', needsValue: true },
  { value: 'lte', label: 'Less than or equal to', needsValue: true },
];

export function operatorNeedsValue(op: ConditionOperator): boolean {
  return OPERATORS.find((o) => o.value === op)?.needsValue ?? true;
}

/** Returns a human-readable error, or null if every condition is complete. */
export function validateExcludeConditions(
  conditions: ExcludeCondition[],
): string | null {
  for (const c of conditions) {
    if (c.enabled === false) continue;
    if (!c.field) return 'Every condition needs a field selected.';
    if (!c.operator) return 'Every condition needs an operator selected.';
    if (
      operatorNeedsValue(c.operator) &&
      (c.value === undefined || c.value === null || c.value === '')
    ) {
      return `"${c.field}" needs a comparison value for this operator.`;
    }
  }
  return null;
}

function emptyCondition(field = ''): ExcludeCondition {
  return {
    field,
    operator: 'equals',
    value: '',
    normalization: { trim: true, lowercase: false, removeWhitespace: false },
  };
}

export default function ExcludeConditionsEditor({
  sourceFields,
  conditions,
  conditionLogic,
  onChange,
  searchQuery = '',
  addRequestSignal,
  showAddButton = true,
  isDirty = false,
  onPreview,
  previewing = false,
  layout = 'stacked',
  embedded = false,
  mappedFieldKeys,
}: {
  sourceFields: FieldDef[];
  conditions: ExcludeCondition[];
  conditionLogic: 'AND' | 'OR';
  onChange: (conditions: ExcludeCondition[], logic: 'AND' | 'OR') => void;
  searchQuery?: string;
  addRequestSignal?: number;
  showAddButton?: boolean;
  isDirty?: boolean;
  onPreview?: () => void;
  previewing?: boolean;
  /** The job-detail workspace uses an aligned grid; the creation wizard keeps
   *  the established stacked editor until that workflow is refined separately. */
  layout?: 'stacked' | 'grid';
  embedded?: boolean;
  mappedFieldKeys?: string[];
}) {
  const update = (index: number, patch: Partial<ExcludeCondition>) => {
    const next = conditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    onChange(next, conditionLogic);
  };

  const remove = (index: number) => {
    onChange(
      conditions.filter((_, i) => i !== index),
      conditionLogic,
    );
  };

  const add = () => {
    onChange(
      [...conditions, emptyCondition(sourceFields[0]?.key ?? '')],
      conditionLogic,
    );
  };
  const lastAddRequestRef = useRef(addRequestSignal);

  useEffect(() => {
    if (
      addRequestSignal === undefined ||
      addRequestSignal === lastAddRequestRef.current
    ) {
      return;
    }
    lastAddRequestRef.current = addRequestSignal;
    add();
  }, [addRequestSignal]);

  const error = validateExcludeConditions(conditions);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleConditions = conditions
    .map((condition, index) => ({ condition, index }))
    .filter(({ condition }) => {
      if (!normalizedSearch) return true;
      const field = sourceFields.find((item) => item.key === condition.field);
      return [
        field?.label,
        condition.field,
        OPERATORS.find((operator) => operator.value === condition.operator)
          ?.label,
        Array.isArray(condition.value)
          ? condition.value.join(', ')
          : condition.value?.toString(),
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });

  if (layout === 'grid') {
    return (
      <div className="flex flex-col gap-3">
        <div
          className={
            embedded
              ? 'hidden'
              : 'bg-muted/40 flex items-start gap-3 rounded-4xl px-4 py-3'
          }
        >
          <Info className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-foreground text-xs font-medium">
              How skip rules work
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Rules are checked against the source record before any field
              mapping runs. A matching record is logged as skipped instead of
              being created or updated.
            </p>
          </div>
        </div>

        <section
          className={
            embedded
              ? 'space-y-0 rounded-none border-0 bg-transparent shadow-none'
              : 'border-border bg-card overflow-hidden rounded-2xl border'
          }
        >
          <div
            className={cn(
              'flex flex-col gap-2.5 pb-2 sm:flex-row sm:items-center sm:justify-between',
              embedded
                ? 'border-0 bg-transparent px-0'
                : 'bg-muted/20 border-border/60 border-b px-4 py-3',
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Source conditions</h3>
              <Badge variant="secondary" className="text-[11px] font-normal">
                {conditions.length}
              </Badge>
            </div>

            <div className="border-border/80 bg-muted/40 inline-flex rounded-xl border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onChange(conditions, 'AND')}
                aria-pressed={conditionLogic === 'AND'}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all select-none',
                  conditionLogic === 'AND'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                ALL Match (AND)
              </button>
              <button
                type="button"
                onClick={() => onChange(conditions, 'OR')}
                aria-pressed={conditionLogic === 'OR'}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all select-none',
                  conditionLogic === 'OR'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                ANY Matches (OR)
              </button>
            </div>
            <div className="sr-only">
              <Select
                value={conditionLogic}
                onValueChange={(value) =>
                  onChange(conditions, value as 'AND' | 'OR')
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-24"
                  aria-label="Combine source conditions with"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Condition Rows: Clean, borderless list matching QuickFieldMapper */}
          <div className="space-y-2.5 pt-2">
            {visibleConditions.map(({ condition: cond, index }) => {
              const operator = OPERATORS.find(
                (item) => item.value === cond.operator,
              );
              const needsValue = operator?.needsValue ?? true;
              const isMulti = operator?.multiValue ?? false;
              const normalization = cond.normalization ?? {};

              const isFieldMissing = cond.enabled !== false && !cond.field;
              const isValueMissing =
                cond.enabled !== false &&
                needsValue &&
                (cond.value === undefined ||
                  cond.value === null ||
                  (typeof cond.value === 'string' &&
                    cond.value.trim() === '') ||
                  (Array.isArray(cond.value) && cond.value.length === 0));
              const hasRowError = isFieldMissing || isValueMissing;

              const activeNormalizationCount = [
                normalization.trim,
                normalization.lowercase,
                normalization.removeWhitespace,
              ].filter(Boolean).length;

              return (
                <div
                  key={index}
                  className={cn(
                    'transition-all',
                    cond.enabled === false && 'opacity-60',
                  )}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    {/* Logic Badge: uniform h-9, matching component border and background */}
                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-border/70 bg-background h-9 w-14 justify-center rounded-xl border text-[10px] font-semibold tracking-wider uppercase shadow-xs',
                          hasRowError
                            ? 'border-destructive/40 text-destructive bg-destructive/5'
                            : 'text-muted-foreground',
                        )}
                      >
                        {index === 0 ? 'Where' : conditionLogic}
                      </Badge>
                    </div>

                    {/* Source field selector */}
                    <div className="min-w-[150px] flex-1">
                      <div
                        className={cn(
                          'rounded-xl transition-all',
                          isFieldMissing &&
                            'ring-1.5 ring-destructive/60 border-destructive border',
                        )}
                      >
                        <FieldSelect
                          fields={sourceFields}
                          mappedFieldKeys={mappedFieldKeys}
                          value={cond.field}
                          onChange={(value) => update(index, { field: value })}
                          placeholder="Select field…"
                          highlightRequired={false}
                          className="border-border/70 bg-background h-9 rounded-xl text-xs shadow-xs"
                        />
                      </div>
                      {isFieldMissing && (
                        <span className="text-destructive mt-1 flex items-center gap-1 pl-0.5 text-[10px] font-medium">
                          <AlertCircle className="size-3 shrink-0" />
                          Please select a field
                        </span>
                      )}
                    </div>

                    {/* Operator selector */}
                    <div className="w-[135px] shrink-0 pt-0">
                      <Select
                        value={cond.operator}
                        onValueChange={(value) =>
                          update(index, {
                            operator: value as ConditionOperator,
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="border-border/70 bg-background h-9 w-full rounded-xl text-xs font-normal shadow-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Comparison value */}
                    {needsValue ? (
                      <div className="min-w-[140px] flex-1">
                        <Input
                          value={
                            Array.isArray(cond.value)
                              ? cond.value.join(', ')
                              : (cond.value?.toString() ?? '')
                          }
                          onChange={(event) =>
                            update(index, {
                              value: isMulti
                                ? event.target.value
                                    .split(',')
                                    .map((val) => val.trim())
                                : event.target.value,
                            })
                          }
                          placeholder={
                            isMulti ? 'value1, value2, …' : 'Comparison value'
                          }
                          uiSize="sm"
                          className={cn(
                            'border-border/70 bg-background h-9 rounded-xl font-mono text-xs shadow-xs',
                            isValueMissing &&
                              'border-destructive ring-destructive/50 text-destructive placeholder:text-destructive/50 focus-visible:ring-destructive/50 ring-1.5',
                          )}
                        />
                        {isValueMissing && (
                          <span className="text-destructive mt-1 flex items-center gap-1 pl-0.5 text-[10px] font-medium">
                            <AlertCircle className="size-3 shrink-0" />
                            Comparison value required
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground border-border/50 bg-muted/15 flex h-9 min-w-[140px] flex-1 items-center rounded-xl border border-dashed px-3 text-xs italic">
                        No value required
                      </div>
                    )}

                    {/* Formatting / Normalize Button */}
                    <div className="shrink-0">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Normalize condition ${index + 1}`}
                            className={cn(
                              'border-border/70 bg-background h-9 gap-1.5 rounded-xl px-2.5 text-xs font-normal shadow-xs',
                              activeNormalizationCount > 0 &&
                                'border-primary/50 text-primary bg-primary/5',
                            )}
                          >
                            <SlidersHorizontal className="size-3.5" />
                            <span className="hidden sm:inline">Normalize</span>
                            {activeNormalizationCount > 0 && (
                              <span className="bg-primary size-1.5 rounded-full" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 gap-3 p-4">
                          <div>
                            <p className="text-sm font-semibold">
                              Normalize before comparing
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              Clean the source value before this condition is
                              evaluated.
                            </p>
                          </div>
                          <label className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs">
                              Trim outer whitespace
                            </span>
                            <Switch
                              checked={!!normalization.trim}
                              onCheckedChange={(value) =>
                                update(index, {
                                  normalization: {
                                    ...normalization,
                                    trim: value,
                                  },
                                })
                              }
                            />
                          </label>
                          <label className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs">Ignore letter case</span>
                            <Switch
                              checked={!!normalization.lowercase}
                              onCheckedChange={(value) =>
                                update(index, {
                                  normalization: {
                                    ...normalization,
                                    lowercase: value,
                                  },
                                })
                              }
                              aria-label="Ignore letter case"
                            />
                          </label>
                          <label className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs">
                              Remove all whitespace
                            </span>
                            <Switch
                              checked={!!normalization.removeWhitespace}
                              onCheckedChange={(value) =>
                                update(index, {
                                  normalization: {
                                    ...normalization,
                                    removeWhitespace: value,
                                  },
                                })
                              }
                            />
                          </label>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Actions: Switch + Delete Button - 100% aligned with corner plus */}
                    <div className="flex h-9 shrink-0 items-center gap-2">
                      <Switch
                        checked={cond.enabled !== false}
                        onCheckedChange={(enabled) =>
                          update(index, { enabled })
                        }
                        aria-label={`Enable condition ${index + 1}`}
                        title={
                          cond.enabled !== false
                            ? 'Condition active'
                            : 'Condition disabled'
                        }
                      />
                      <div className="flex w-8 items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 shrink-0 cursor-pointer rounded-lg"
                          aria-label={`Remove condition ${index + 1}`}
                          title="Remove condition"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Action Row: condition count on left, Preview + Corner (+) on right in one line */}
            {conditions.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <div className="text-muted-foreground flex items-center gap-2.5 text-xs">
                  <span>
                    {conditions.length} condition
                    {conditions.length === 1 ? '' : 's'}
                  </span>
                  {isDirty && (
                    <span className="text-foreground flex items-center gap-1.5">
                      <span className="bg-warning size-1.5 rounded-full" />
                      Unsaved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onPreview}
                      disabled={
                        previewing || conditions.length === 0 || !!error
                      }
                      aria-label="Preview matches"
                      title="Preview matches"
                      className="border-border/70 bg-background h-7.5 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs font-normal shadow-xs"
                    >
                      <SearchCheck className="size-3.5" />
                      <span className="hidden sm:inline">
                        {previewing ? 'Previewing…' : 'Preview matches'}
                      </span>
                    </Button>
                  )}
                  {showAddButton && (
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={add}
                        title="Add condition"
                        aria-label="Add condition"
                        className="border-primary/40 bg-background text-primary hover:border-primary hover:bg-primary/10 size-7.5 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {conditions.length === 0 && (
            <div className="border-border/60 bg-muted/10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center">
              <div>
                <p className="text-sm font-medium">No skip conditions</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Every source record is currently eligible to sync.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onPreview}
                    disabled={true}
                    aria-label="Preview matches"
                    title="Preview matches"
                    className="border-border/70 bg-background h-8 cursor-pointer gap-1.5 rounded-lg px-3 text-xs font-medium shadow-xs"
                  >
                    <SearchCheck className="size-3.5" />
                    Preview matches
                  </Button>
                )}
                {showAddButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={add}
                    className="border-border/70 bg-background h-8 cursor-pointer gap-1.5 rounded-lg px-3 text-xs font-medium shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    Add condition
                  </Button>
                )}
              </div>
            </div>
          )}

          {normalizedSearch &&
            visibleConditions.length === 0 &&
            conditions.length > 0 && (
              <div className="border-border/60 bg-muted/10 rounded-2xl border border-dashed px-4 py-8 text-center text-xs">
                <p className="text-sm font-medium">No matching conditions</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try a different search term.
                </p>
              </div>
            )}
        </section>
      </div>
    );
  }

  return (
    <FieldGroup>
      <div className="bg-muted/40 text-muted-foreground rounded-4xl border p-3 text-xs">
        Optional — a source record is skipped entirely (never created or
        updated) when it matches these conditions, checked before any field
        mapping runs. Leave empty to sync every record, same as today.
      </div>

      {conditions.length > 1 && (
        <Field>
          <FieldLabel>Combine conditions with</FieldLabel>
          <Select
            value={conditionLogic}
            onValueChange={(v) => onChange(conditions, v as 'AND' | 'OR')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="space-y-3">
        {visibleConditions.map(({ condition: cond, index: i }) => {
          const opDef = OPERATORS.find((o) => o.value === cond.operator);
          const needsValue = opDef?.needsValue ?? true;
          const isMulti = opDef?.multiValue ?? false;
          const rowIncomplete = !cond.field || !cond.operator;
          const norm = cond.normalization ?? {};

          return (
            <div
              key={i}
              className={cn(
                'space-y-2 rounded-4xl border p-3 transition-opacity',
                cond.enabled === false
                  ? 'bg-muted/10 opacity-60'
                  : 'bg-muted/30',
              )}
              data-invalid={rowIncomplete}
            >
              <div className="flex items-center gap-2">
                <FieldSelect
                  fields={sourceFields}
                  mappedFieldKeys={mappedFieldKeys}
                  value={cond.field}
                  onChange={(v) => update(i, { field: v })}
                  placeholder="Select field…"
                  highlightRequired={false}
                  className="flex-1"
                />

                <Select
                  value={cond.operator}
                  onValueChange={(v) =>
                    update(i, { operator: v as ConditionOperator })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Switch
                  checked={cond.enabled !== false}
                  onCheckedChange={(enabled) => update(i, { enabled })}
                  aria-label={`Enable condition ${i + 1}`}
                  title={
                    cond.enabled !== false
                      ? 'Condition active'
                      : 'Condition disabled'
                  }
                />

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(i)}
                  title="Remove condition"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {needsValue && (
                <Input
                  value={
                    Array.isArray(cond.value)
                      ? cond.value.join(', ')
                      : (cond.value?.toString() ?? '')
                  }
                  onChange={(e) =>
                    update(i, {
                      value: isMulti
                        ? e.target.value.split(',').map((s) => s.trim())
                        : e.target.value,
                    })
                  }
                  placeholder={
                    isMulti ? 'value1, value2, …' : 'Comparison value'
                  }
                  className="font-mono"
                />
              )}

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5">
                  <Switch
                    checked={!!norm.trim}
                    onCheckedChange={(v) =>
                      update(i, { normalization: { ...norm, trim: v } })
                    }
                  />
                  <span className="text-muted-foreground text-xs">
                    Trim whitespace
                  </span>
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch
                    checked={!!norm.lowercase}
                    onCheckedChange={(v) =>
                      update(i, { normalization: { ...norm, lowercase: v } })
                    }
                  />
                  <span className="text-muted-foreground text-xs">
                    Case-insensitive
                  </span>
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch
                    checked={!!norm.removeWhitespace}
                    onCheckedChange={(v) =>
                      update(i, {
                        normalization: { ...norm, removeWhitespace: v },
                      })
                    }
                  />
                  <span className="text-muted-foreground text-xs">
                    Ignore whitespace
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {normalizedSearch && visibleConditions.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No conditions match your search.
        </p>
      )}

      {showAddButton && (
        <Button variant="outline" size="sm" onClick={add} type="button">
          <Plus className="mr-2 size-3.5" /> Add Condition
        </Button>
      )}

      {error && conditions.length > 0 && (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </FieldGroup>
  );
}
