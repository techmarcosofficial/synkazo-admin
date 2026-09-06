import {
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
        <div className="bg-muted/40 flex items-start gap-3 rounded-4xl px-4 py-3">
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

        <section className="border-border bg-card overflow-hidden rounded-4xl border">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Skip conditions</h3>
                  <Badge variant="secondary" className="font-normal">
                    {conditions.length}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {conditions.length === 0
                    ? 'No records are currently excluded.'
                    : conditionLogic === 'AND'
                      ? 'A record is skipped only when every condition matches.'
                      : 'A record is skipped when any condition matches.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Combine with
              </span>
              <Select
                value={conditionLogic}
                onValueChange={(value) =>
                  onChange(conditions, value as 'AND' | 'OR')
                }
              >
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {visibleConditions.map(({ condition: cond, index }) => {
            const operator = OPERATORS.find(
              (item) => item.value === cond.operator,
            );
            const needsValue = operator?.needsValue ?? true;
            const isMulti = operator?.multiValue ?? false;
            const normalization = cond.normalization ?? {};
            const selectedField = sourceFields.find(
              (field) => field.key === cond.field,
            );
            const missingField = !cond.field;
            const missingValue =
              needsValue &&
              (cond.value === undefined ||
                cond.value === null ||
                cond.value === '');
            const activeNormalizationCount = [
              normalization.trim,
              normalization.lowercase,
              normalization.removeWhitespace,
            ].filter(Boolean).length;

            return (
              <div
                key={index}
                className="border-border grid min-w-0 gap-3 border-t px-4 py-3 xl:grid-cols-[4.5rem_minmax(13rem,1.15fr)_minmax(11rem,0.8fr)_minmax(13rem,1fr)_10rem_2.5rem] xl:items-start"
                data-invalid={missingField || missingValue}
              >
                <div className="flex h-9 items-center xl:mt-5">
                  <Badge
                    variant={index === 0 ? 'secondary' : 'outline'}
                    className="font-normal"
                  >
                    {index === 0 ? 'Where' : conditionLogic}
                  </Badge>
                </div>

                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                    Source field
                  </p>
                  <FieldSelect
                    fields={sourceFields}
                    value={cond.field}
                    onChange={(value) => update(index, { field: value })}
                    placeholder="Select field…"
                    highlightRequired={false}
                    className="h-9 text-xs"
                  />
                  {selectedField && (
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <span className="text-muted-foreground truncate text-xs">
                        {selectedField.key}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 shrink-0 px-1.5 text-[10px] font-normal"
                      >
                        {selectedField.type || 'Text'}
                      </Badge>
                    </div>
                  )}
                  {missingField && (
                    <p className="text-destructive mt-1 text-xs">
                      Select a source field.
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                    Operator
                  </p>
                  <Select
                    value={cond.operator}
                    onValueChange={(value) =>
                      update(index, { operator: value as ConditionOperator })
                    }
                  >
                    <SelectTrigger size="sm" className="w-full text-xs">
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

                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                    Comparison value
                  </p>
                  {needsValue ? (
                    <>
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
                                  .map((value) => value.trim())
                              : event.target.value,
                          })
                        }
                        placeholder={
                          isMulti ? 'value1, value2, …' : 'Comparison value'
                        }
                        aria-invalid={missingValue}
                        className="h-9 font-mono text-xs"
                      />
                      {missingValue && (
                        <p className="text-destructive mt-1 text-xs">
                          Enter a comparison value.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground flex h-9 items-center text-xs">
                      No value required
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                    Formatting
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-1.5">
                          <SlidersHorizontal /> Normalize
                        </span>
                        {activeNormalizationCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-4 min-w-4 px-1 text-[10px]"
                          >
                            {activeNormalizationCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Normalize before comparing
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Clean the source value before this condition is
                          evaluated.
                        </p>
                      </div>
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-xs">Trim outer whitespace</span>
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
                      <label className="flex items-center justify-between gap-3">
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
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-xs">Remove all whitespace</span>
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

                <div className="flex h-9 items-center justify-end xl:mt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove condition ${index + 1}`}
                    title="Remove condition"
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}

          {conditions.length === 0 && (
            <div className="border-t px-4 py-10 text-center">
              <p className="text-sm font-medium">No skip conditions</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Every source record is currently eligible to sync.
              </p>
            </div>
          )}

          {normalizedSearch &&
            visibleConditions.length === 0 &&
            conditions.length > 0 && (
              <div className="border-t px-4 py-10 text-center">
                <p className="text-sm font-medium">No matching conditions</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try a different search term.
                </p>
              </div>
            )}

          <div className="border-border bg-muted/20 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreview}
                disabled={
                  !onPreview || previewing || conditions.length === 0 || !!error
                }
              >
                <SearchCheck />
                {previewing ? 'Previewing…' : 'Preview matches'}
              </Button>
              {showAddButton && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={add}
                >
                  <Plus /> Add condition
                </Button>
              )}
            </div>
          </div>
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
              className="bg-muted/30 space-y-2 rounded-4xl border p-3"
              data-invalid={rowIncomplete}
            >
              <div className="flex items-center gap-2">
                <FieldSelect
                  fields={sourceFields}
                  value={cond.field}
                  onChange={(v) => update(i, { field: v })}
                  placeholder="Select field…"
                  highlightRequired={false}
                  className="h-9 flex-1 text-xs"
                />

                <Select
                  value={cond.operator}
                  onValueChange={(v) =>
                    update(i, { operator: v as ConditionOperator })
                  }
                >
                  <SelectTrigger className="h-9 w-52 text-xs">
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
                  className="h-9 font-mono text-xs"
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
