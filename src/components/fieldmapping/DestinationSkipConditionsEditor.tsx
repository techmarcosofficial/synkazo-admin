import { AlertCircle, Plus, Trash2 } from 'lucide-react';

import { FieldSelect, type FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { DestinationSkipCondition } from '@/types/conditions';

interface Props {
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  conditions: DestinationSkipCondition[];
  onChange: (conditions: DestinationSkipCondition[]) => void;
  mappedSourceKeys?: string[];
  mappedDestinationKeys?: string[];
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
      (condition) =>
        condition.enabled !== false &&
        (!condition.sourceField || !condition.destinationField),
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
  mappedSourceKeys,
  mappedDestinationKeys,
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
        embedded
          ? 'space-y-0 rounded-none border-0 bg-transparent shadow-none'
          : 'border-border bg-card overflow-hidden rounded-2xl border'
      }
      aria-labelledby="destination-conditions-heading"
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
          <h3
            id="destination-conditions-heading"
            className="text-sm font-semibold"
          >
            Destination conditions
          </h3>
          <Badge variant="secondary" className="text-[11px] font-normal">
            {conditions.length}
          </Badge>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="border-border/60 bg-muted/10 text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center text-xs">
          <span>No destination-aware skip conditions.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...conditions, { ...EMPTY }])}
            className="border-border/70 bg-background text-foreground h-8 cursor-pointer gap-1.5 rounded-lg px-3 text-xs font-medium shadow-xs"
          >
            <Plus className="size-3.5" />
            Add destination condition
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 pt-2">
          {conditions.map((condition, index) => {
            const isSourceMissing =
              condition.enabled !== false && !condition.sourceField;
            const isDestMissing =
              condition.enabled !== false && !condition.destinationField;

            return (
              <div
                key={`${condition.sourceField}-${condition.destinationField}-${index}`}
                className={cn(
                  'transition-all',
                  condition.enabled === false && 'opacity-60',
                )}
              >
                <div className="flex flex-wrap items-start gap-2">
                  {/* Source Field */}
                  <div className="min-w-[140px] flex-1">
                    <div
                      className={cn(
                        'rounded-xl transition-all',
                        isSourceMissing &&
                          'ring-1.5 ring-destructive/60 border-destructive border',
                      )}
                    >
                      <FieldSelect
                        fields={sourceFields}
                        mappedFieldKeys={mappedSourceKeys}
                        value={condition.sourceField}
                        onChange={(sourceField) =>
                          update(index, { sourceField })
                        }
                        placeholder="Source field…"
                        highlightRequired={false}
                        aria-label={`Destination condition ${index + 1} source field`}
                        className="border-border/70 bg-background h-9 rounded-xl text-xs shadow-xs"
                      />
                    </div>
                    {isSourceMissing && (
                      <span className="text-destructive mt-1 flex items-center gap-1 pl-0.5 text-[10px] font-medium">
                        <AlertCircle className="size-3 shrink-0" />
                        Select source field
                      </span>
                    )}
                  </div>

                  {/* Operator */}
                  <div className="w-[190px] shrink-0 pt-0">
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
                        className="border-border/70 bg-background h-9 w-full rounded-xl text-xs font-normal shadow-xs"
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
                  </div>

                  {/* Destination Field */}
                  <div className="min-w-[140px] flex-1">
                    <div
                      className={cn(
                        'rounded-xl transition-all',
                        isDestMissing &&
                          'ring-1.5 ring-destructive/60 border-destructive border',
                      )}
                    >
                      <FieldSelect
                        fields={destinationFields}
                        mappedFieldKeys={mappedDestinationKeys}
                        value={condition.destinationField}
                        onChange={(destinationField) =>
                          update(index, { destinationField })
                        }
                        placeholder="Destination field…"
                        highlightRequired={false}
                        aria-label={`Destination condition ${index + 1} destination field`}
                        className="border-border/70 bg-background h-9 rounded-xl text-xs shadow-xs"
                      />
                    </div>
                    {isDestMissing && (
                      <span className="text-destructive mt-1 flex items-center gap-1 pl-0.5 text-[10px] font-medium">
                        <AlertCircle className="size-3 shrink-0" />
                        Select destination field
                      </span>
                    )}
                  </div>

                  {/* Actions: Switch + Delete Button */}
                  <div className="flex h-9 shrink-0 items-center gap-2">
                    <Switch
                      checked={condition.enabled !== false}
                      onCheckedChange={(enabled) => update(index, { enabled })}
                      aria-label={`Enable destination condition ${index + 1}`}
                      title={
                        condition.enabled !== false
                          ? 'Condition active'
                          : 'Condition disabled'
                      }
                    />
                    <div className="flex w-8 items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Remove destination condition"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 shrink-0 cursor-pointer rounded-lg"
                        onClick={() =>
                          onChange(
                            conditions.filter(
                              (_, current) => current !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Action Row: condition count on left, Corner (+) on right in one line */}
          {conditions.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground text-xs">
                {conditions.length} condition
                {conditions.length === 1 ? '' : 's'}
              </span>
              <div className="flex w-8 shrink-0 items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => onChange([...conditions, { ...EMPTY }])}
                  title="Add destination condition"
                  aria-label="Add destination condition"
                  className="border-primary/40 bg-background text-primary hover:border-primary hover:bg-primary/10 size-7.5 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
