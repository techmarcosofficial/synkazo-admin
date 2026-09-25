import { Plus, Trash2 } from 'lucide-react';

import type { FieldDef } from './FieldMappingCanvas';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DestinationSkipCondition } from '@/types/conditions';

interface Props {
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  conditions: DestinationSkipCondition[];
  onChange: (conditions: DestinationSkipCondition[]) => void;
}

const EMPTY: DestinationSkipCondition = {
  sourceField: '',
  destinationField: '',
  operator: 'different_from_destination',
  direction: 'forward_only',
  origin: 'user',
};

export function validateDestinationSkipConditions(
  conditions: DestinationSkipCondition[],
): string | null {
  if (
    conditions.some(
      (condition) => !condition.sourceField || !condition.destinationField,
    )
  ) {
    return 'Choose both a source and destination field for every destination condition.';
  }
  return null;
}

export default function DestinationSkipConditionsEditor({
  sourceFields,
  destinationFields,
  conditions,
  onChange,
}: Props) {
  const update = (index: number, patch: Partial<DestinationSkipCondition>) =>
    onChange(
      conditions.map((condition, current) =>
        current === index
          ? { ...condition, ...patch, origin: 'user' }
          : condition,
      ),
    );

  return (
    <section className="space-y-3 rounded-4xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Destination conditions</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Applied only after an existing destination record is found. Matching
            any row skips the whole update.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...conditions, { ...EMPTY }])}
        >
          <Plus /> Add destination condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-3xl px-4 py-5 text-center text-sm">
          No destination-aware skip conditions.
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <div
              key={`${condition.sourceField}-${condition.destinationField}-${index}`}
              className="grid gap-2 rounded-3xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
            >
              <Select
                value={condition.sourceField}
                onValueChange={(sourceField) => update(index, { sourceField })}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={condition.operator}
                onValueChange={(operator) =>
                  update(index, {
                    operator: operator as DestinationSkipCondition['operator'],
                  })
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="different_from_destination">
                    Different from destination
                  </SelectItem>
                  <SelectItem value="exists_in_destination">
                    Exists in destination
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={condition.destinationField}
                onValueChange={(destinationField) =>
                  update(index, { destinationField })
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Destination field" />
                </SelectTrigger>
                <SelectContent>
                  {destinationFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove destination condition"
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onChange(conditions.filter((_, current) => current !== index))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
