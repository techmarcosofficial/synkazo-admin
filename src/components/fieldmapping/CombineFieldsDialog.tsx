import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CombineComponent,
  type CombineConfig,
  type CombineSeparator,
  previewCombinedFields,
} from '@/lib/combineFields';

export default function CombineFieldsDialog({
  open,
  onOpenChange,
  sourceFields,
  destinationFields,
  onApply,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  onApply: (destinationField: string, config: CombineConfig) => void;
  initial?: { destinationField: string; config: CombineConfig } | null;
}) {
  const initialFields = sourceFields.slice(0, 2);
  const [destinationField, setDestinationField] = useState('');
  const [name, setName] = useState('');
  const [separator, setSeparator] = useState<CombineSeparator>('space');
  const [customSeparator, setCustomSeparator] = useState('');
  const [components, setComponents] = useState<CombineComponent[]>(
    initialFields.map((field) => ({ type: 'field', value: field.key })),
  );
  const [samples, setSamples] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDestinationField(initial.destinationField);
      setName(initial.config.name ?? '');
      setSeparator(initial.config.separator);
      setCustomSeparator(initial.config.customSeparator ?? '');
      setComponents(initial.config.components);
    } else {
      setDestinationField('');
      setName('');
      setSeparator('space');
      setCustomSeparator('');
      setComponents(
        sourceFields
          .slice(0, 2)
          .map((field) => ({ type: 'field', value: field.key })),
      );
    }
    setSamples({});
  }, [initial?.config, initial?.destinationField, open, sourceFields]);
  const fieldKeys = components
    .filter((component) => component.type === 'field')
    .map((component) => component.value);
  const valid =
    destinationField &&
    fieldKeys.length >= 2 &&
    new Set(fieldKeys).size === fieldKeys.length &&
    fieldKeys.every(Boolean);
  const config = useMemo<CombineConfig>(
    () => ({
      type: 'combine',
      name: name.trim() || undefined,
      separator,
      customSeparator,
      components,
    }),
    [name, separator, customSeparator, components],
  );
  const update = (index: number, patch: Partial<CombineComponent>) =>
    setComponents((current) =>
      current.map((component, at) =>
        at === index
          ? ({ ...component, ...patch } as CombineComponent)
          : component,
      ),
    );
  const move = (index: number, offset: number) =>
    setComponents((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>Combine multiple fields</DialogTitle>
          <DialogDescription>
            Build a destination value from ordered fields and optional text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <section className="space-y-3" aria-labelledby="combine-sources">
            <h3 id="combine-sources" className="text-sm font-semibold">
              Source parts
            </h3>
            <div className="space-y-2">
              {components.map((component, index) => (
                <div
                  key={index}
                  className="bg-muted/30 grid grid-cols-[auto_1fr] gap-2 rounded-xl border p-2 sm:grid-cols-[auto_7rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span
                    className="text-muted-foreground flex size-9 items-center justify-center text-xs"
                    aria-label={`Part ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <Select
                    value={component.type}
                    onValueChange={(type) =>
                      update(index, {
                        type: type as 'field' | 'text',
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Part ${index + 1} type`}
                      className="col-start-2 sm:col-start-auto"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Field</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  {component.type === 'field' ? (
                    <Select
                      value={component.value}
                      onValueChange={(value) => update(index, { value })}
                    >
                      <SelectTrigger
                        aria-label={`Part ${index + 1} source field`}
                        className="col-span-2 min-w-0 sm:col-span-1"
                      >
                        <SelectValue placeholder="Choose source field" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label ?? field.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      aria-label={`Part ${index + 1} static text`}
                      className="col-span-2 min-w-0 sm:col-span-1"
                      value={component.value}
                      onChange={(event) =>
                        update(index, { value: event.target.value })
                      }
                      placeholder="Static text"
                    />
                  )}
                  <div className="col-span-2 flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Move part ${index + 1} up`}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === components.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Move part ${index + 1} down`}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setComponents((current) =>
                          current.filter((_, at) => at !== index),
                        )
                      }
                      aria-label={`Remove part ${index + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setComponents((current) => [
                    ...current,
                    { type: 'field', value: '' },
                  ])
                }
              >
                <Plus /> Add field
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setComponents((current) => [
                    ...current,
                    { type: 'text', value: '' },
                  ])
                }
              >
                <Plus /> Add text
              </Button>
            </div>
          </section>
          <section className="space-y-2" aria-labelledby="combine-separator">
            <h3 id="combine-separator" className="text-sm font-semibold">
              Separator
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={separator}
                onValueChange={(value) =>
                  setSeparator(value as CombineSeparator)
                }
              >
                <SelectTrigger aria-label="Separator between parts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No separator</SelectItem>
                  <SelectItem value="space">Space</SelectItem>
                  <SelectItem value="comma">Comma</SelectItem>
                  <SelectItem value="comma_space">Comma + space</SelectItem>
                  <SelectItem value="dash">Dash</SelectItem>
                  <SelectItem value="slash">Slash</SelectItem>
                  <SelectItem value="newline">New line</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {separator === 'custom' && (
                <Input
                  aria-label="Custom separator"
                  value={customSeparator}
                  onChange={(event) => setCustomSeparator(event.target.value)}
                  placeholder="Custom separator"
                />
              )}
            </div>
          </section>
          <section className="space-y-2" aria-labelledby="combine-destination">
            <h3 id="combine-destination" className="text-sm font-semibold">
              Destination
            </h3>
            <Select
              value={destinationField}
              onValueChange={setDestinationField}
            >
              <SelectTrigger aria-label="Destination field">
                <SelectValue placeholder="Select destination field" />
              </SelectTrigger>
              <SelectContent>
                {destinationFields
                  .filter((field) => !field.readOnly)
                  .map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </section>
          <section className="space-y-2" aria-labelledby="combine-name">
            <h3 id="combine-name" className="text-sm font-semibold">
              Mapping name{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </h3>
            <Input
              aria-label="Mapping name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Generated from source fields if blank"
              maxLength={120}
            />
          </section>
          <section className="space-y-2" aria-labelledby="combine-preview">
            <h3 id="combine-preview" className="text-sm font-semibold">
              Preview
            </h3>
            {fieldKeys.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from(new Set(fieldKeys))
                  .filter(Boolean)
                  .map((key) => (
                    <Input
                      key={key}
                      aria-label={`Preview value for ${sourceFields.find((field) => field.key === key)?.label ?? key}`}
                      value={samples[key] ?? ''}
                      onChange={(event) =>
                        setSamples((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={
                        sourceFields.find((field) => field.key === key)
                          ?.label ?? key
                      }
                    />
                  ))}
              </div>
            )}
            <p
              aria-live="polite"
              className="bg-muted/40 min-h-10 rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap"
            >
              {previewCombinedFields(config, samples) ??
                'All source values are empty'}
            </p>
          </section>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              onApply(destinationField, config);
              onOpenChange(false);
            }}
          >
            {initial ? 'Save combined mapping' : 'Add combined mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
