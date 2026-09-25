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
      setSeparator(initial.config.separator);
      setCustomSeparator(initial.config.customSeparator ?? '');
      setComponents(initial.config.components);
    } else {
      setDestinationField('');
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
    () => ({ type: 'combine', separator, customSeparator, components }),
    [separator, customSeparator, components],
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Combine multiple fields</DialogTitle>
          <DialogDescription>
            Build one forward-only destination value from ordered source fields
            and optional text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {components.map((component, index) => (
              <div
                key={index}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-2"
              >
                <Select
                  value={component.type}
                  onValueChange={(type) =>
                    update(index, { type: type as 'field' | 'text', value: '' })
                  }
                >
                  <SelectTrigger size="sm">
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
                    <SelectTrigger size="sm">
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
                    value={component.value}
                    onChange={(event) =>
                      update(index, { value: event.target.value })
                    }
                    placeholder="Static text"
                  />
                )}
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
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
                    aria-label="Remove component"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
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
                <Plus /> Field
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
                <Plus /> Text
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={separator}
              onValueChange={(value) => setSeparator(value as CombineSeparator)}
            >
              <SelectTrigger>
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
                value={customSeparator}
                onChange={(event) => setCustomSeparator(event.target.value)}
                placeholder="Custom separator"
              />
            )}
          </div>
          <Select value={destinationField} onValueChange={setDestinationField}>
            <SelectTrigger>
              <SelectValue placeholder="Destination field" />
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
          <div className="rounded-3xl border p-3">
            <p className="mb-2 text-xs font-semibold">Preview values</p>
            {Array.from(new Set(fieldKeys))
              .filter(Boolean)
              .map((key) => (
                <Input
                  key={key}
                  className="mb-2"
                  value={samples[key] ?? ''}
                  onChange={(event) =>
                    setSamples((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={
                    sourceFields.find((field) => field.key === key)?.label ??
                    key
                  }
                />
              ))}
            <p className="bg-muted/40 min-h-9 rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">
              {previewCombinedFields(config, samples) ??
                'All source values are empty'}
            </p>
          </div>
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
            Add combined mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
