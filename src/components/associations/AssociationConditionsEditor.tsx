import { CircleHelp, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type {
  AssociationCondition,
  ConditionOperator,
} from '@/api/associations';

interface ObjectField {
  field: string;
  isArray: boolean;
}

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
export function validateConditions(
  conditions: AssociationCondition[],
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

function emptyCondition(field = ''): AssociationCondition {
  return {
    field,
    operator: 'is_not_empty',
    value: null,
    normalization: { trim: true, lowercase: false, removeWhitespace: false },
  };
}

export default function AssociationConditionsEditor({
  fields,
  conditions,
  conditionLogic,
  onChange,
}: {
  fields: ObjectField[];
  conditions: AssociationCondition[];
  conditionLogic: 'AND' | 'OR';
  onChange: (conditions: AssociationCondition[], logic: 'AND' | 'OR') => void;
}) {
  const update = (index: number, patch: Partial<AssociationCondition>) => {
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
      [...conditions, emptyCondition(fields[0]?.field ?? '')],
      conditionLogic,
    );
  };

  const error = validateConditions(conditions);

  return (
    <div className="overflow-hidden rounded-3xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Conditions</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground rounded-full"
                  aria-label="How association conditions work"
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Optional filters checked on the source record before creating an
                association.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="secondary" className="font-normal">
            {conditions.length}
          </Badge>
        </div>

        {conditions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Combine conditions with
            </span>
            <Select
              value={conditionLogic}
              onValueChange={(v) => onChange(conditions, v as 'AND' | 'OR')}
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
        )}
      </div>

      {conditions.map((cond, i) => {
        const opDef = OPERATORS.find((o) => o.value === cond.operator);
        const needsValue = opDef?.needsValue ?? true;
        const isMulti = opDef?.multiValue ?? false;
        const missingValue =
          needsValue &&
          (cond.value === undefined ||
            cond.value === null ||
            cond.value === '');
        const norm = cond.normalization ?? {};
        const activeNormalizationCount = [
          norm.trim,
          norm.lowercase,
          norm.removeWhitespace,
        ].filter(Boolean).length;

        return (
          <div
            key={i}
            className="grid gap-2 border-t px-4 py-3 md:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem] md:items-end"
            data-invalid={!cond.field || !cond.operator || missingValue}
          >
            <div className="flex h-9 items-center">
              <Badge
                variant={i === 0 ? 'secondary' : 'outline'}
                className="font-normal"
              >
                {i === 0 ? 'Where' : conditionLogic}
              </Badge>
            </div>

            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                Source field
              </p>
              {fields.length > 0 ? (
                <Select
                  value={cond.field}
                  onValueChange={(v) => update(i, { field: v })}
                >
                  <SelectTrigger className="h-9 w-full font-mono text-xs">
                    <SelectValue placeholder="Select field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.field} value={f.field}>
                        {f.field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={cond.field}
                  onChange={(e) => update(i, { field: e.target.value })}
                  placeholder="Field name"
                  className="h-9 font-mono text-xs"
                />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                Operator
              </p>
              <Select
                value={cond.operator}
                onValueChange={(v) =>
                  update(i, { operator: v as ConditionOperator })
                }
              >
                <SelectTrigger className="h-9 w-full text-xs">
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
            </div>

            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                Value
              </p>
              {needsValue ? (
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
                  aria-invalid={missingValue}
                  className="h-9 font-mono text-xs"
                />
              ) : (
                <div className="bg-muted/30 text-muted-foreground flex h-9 items-center rounded-3xl border px-3 text-xs">
                  Not required
                </div>
              )}
            </div>

            <div className="flex h-9 items-center justify-end gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground relative"
                    aria-label={`Formatting options for condition ${i + 1}`}
                    title="Formatting options"
                  >
                    <SlidersHorizontal />
                    {activeNormalizationCount > 0 && (
                      <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 gap-3">
                  <div>
                    <p className="text-sm font-semibold">Format before match</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Normalize the source value before evaluating this row.
                    </p>
                  </div>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-xs">Trim outer whitespace</span>
                    <Switch
                      checked={!!norm.trim}
                      onCheckedChange={(v) =>
                        update(i, { normalization: { ...norm, trim: v } })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-xs">Ignore letter case</span>
                    <Switch
                      checked={!!norm.lowercase}
                      onCheckedChange={(v) =>
                        update(i, {
                          normalization: { ...norm, lowercase: v },
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-xs">Remove all whitespace</span>
                    <Switch
                      checked={!!norm.removeWhitespace}
                      onCheckedChange={(v) =>
                        update(i, {
                          normalization: { ...norm, removeWhitespace: v },
                        })
                      }
                    />
                  </label>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(i)}
                aria-label={`Remove condition ${i + 1}`}
                title="Remove condition"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        );
      })}

      {conditions.length === 0 && (
        <div className="text-muted-foreground border-t px-4 py-6 text-center text-xs">
          No conditions — every matched record is eligible.
        </div>
      )}

      {error && conditions.length > 0 && (
        <p className="text-destructive border-t px-4 py-2 text-xs">{error}</p>
      )}

      <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-2.5">
        <span className="text-muted-foreground text-xs">
          {conditions.length} condition{conditions.length === 1 ? '' : 's'}
        </span>
        <Button variant="outline" size="sm" onClick={add} type="button">
          <Plus /> Add condition
        </Button>
      </div>
    </div>
  );
}
