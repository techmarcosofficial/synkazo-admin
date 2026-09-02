import { Plus, X } from 'lucide-react';

import { FieldSelect, type FieldDef } from './FieldMappingCanvas';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  { value: 'in', label: 'In (comma-separated)', needsValue: true, multiValue: true },
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
}: {
  sourceFields: FieldDef[];
  conditions: ExcludeCondition[];
  conditionLogic: 'AND' | 'OR';
  onChange: (conditions: ExcludeCondition[], logic: 'AND' | 'OR') => void;
}) {
  const update = (index: number, patch: Partial<ExcludeCondition>) => {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
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

  const error = validateExcludeConditions(conditions);

  return (
    <FieldGroup>
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
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
        {conditions.map((cond, i) => {
          const opDef = OPERATORS.find((o) => o.value === cond.operator);
          const needsValue = opDef?.needsValue ?? true;
          const isMulti = opDef?.multiValue ?? false;
          const rowIncomplete = !cond.field || !cond.operator;
          const norm = cond.normalization ?? {};

          return (
            <div
              key={i}
              className="bg-muted/30 space-y-2 rounded-lg border p-3"
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
                  placeholder={isMulti ? 'value1, value2, …' : 'Comparison value'}
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

      <Button variant="outline" size="sm" onClick={add} type="button">
        <Plus className="mr-2 size-3.5" /> Add Condition
      </Button>

      {error && conditions.length > 0 && (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </FieldGroup>
  );
}
