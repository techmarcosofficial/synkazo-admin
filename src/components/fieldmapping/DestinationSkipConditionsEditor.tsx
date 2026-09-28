import { Plus, Trash2 } from 'lucide-react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
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
  embedded?: boolean;
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
  embedded = false,
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
    <section
      className={
        embedded ? 'overflow-hidden' : 'overflow-hidden rounded-4xl border'
      }
      aria-labelledby="destination-conditions-heading"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3
              id="destination-conditions-heading"
              className="text-sm font-semibold"
            >
              Destination conditions
            </h3>
            <Badge variant="secondary" className="font-normal">
              {conditions.length}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Applied only after an existing destination record is found. Matching
            any row skips the whole update.
          </p>
        </div>
      </div>

      <div className="px-4 pb-3">
        {conditions.length === 0 ? (
          <div className="bg-muted/30 text-muted-foreground rounded-2xl px-4 py-4 text-center text-sm">
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
                  onValueChange={(sourceField) =>
                    update(index, { sourceField })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label={`Destination condition ${index + 1} source field`}
                  >
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
                      operator:
                        operator as DestinationSkipCondition['operator'],
                    })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label={`Destination condition ${index + 1} operator`}
                  >
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
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label={`Destination condition ${index + 1} destination field`}
                  >
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
                    onChange(
                      conditions.filter((_, current) => current !== index),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-border bg-muted/20 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-xs">
          {conditions.length} condition{conditions.length === 1 ? '' : 's'}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...conditions, { ...EMPTY }])}
        >
          <Plus /> Add destination condition
        </Button>
      </div>
    </section>
  );
}
