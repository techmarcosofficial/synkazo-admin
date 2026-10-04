import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  GripVertical,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

export const SEPARATOR_PRESETS: {
  id: CombineSeparator;
  label: string;
  preview: string;
}[] = [
  { id: 'space', label: 'Space', preview: '" "' },
  { id: 'comma_space', label: 'Comma + Space', preview: '", "' },
  { id: 'comma', label: 'Comma', preview: '","' },
  { id: 'dash', label: 'Dash', preview: '" - "' },
  { id: 'slash', label: 'Slash', preview: '"/"' },
  { id: 'newline', label: 'New Line', preview: '\\n' },
  { id: 'none', label: 'None', preview: '""' },
  { id: 'custom', label: 'Custom', preview: '...' },
];

export interface CombineFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  onApply: (destinationField: string, config: CombineConfig) => void;
  initial?: { destinationField: string; config: CombineConfig } | null;
}

export default function CombineFieldsDialog({
  open,
  onOpenChange,
  sourceFields,
  destinationFields,
  onApply,
  initial,
}: CombineFieldsDialogProps) {
  const initialFields = useMemo(() => sourceFields.slice(0, 2), [sourceFields]);

  const [destinationField, setDestinationField] = useState('');
  const [name, setName] = useState('');
  const [separator, setSeparator] = useState<CombineSeparator>('space');
  const [customSeparator, setCustomSeparator] = useState('');
  const [components, setComponents] = useState<CombineComponent[]>(
    initialFields.map((field) => ({ type: 'field', value: field.key })),
  );
  const [samples, setSamples] = useState<Record<string, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDestinationField(initial.destinationField);
      setName(initial.config.name ?? '');
      setSeparator(initial.config.separator);
      setCustomSeparator(initial.config.customSeparator ?? '');

      // Filter strictly for field components (no useless text components)
      const fieldComponents = (initial.config.components || []).filter(
        (c) => c.type === 'field',
      );
      setComponents(
        fieldComponents.length >= 2
          ? fieldComponents
          : initialFields.map((field) => ({ type: 'field', value: field.key })),
      );
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
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [initial, open, sourceFields, initialFields]);

  const fieldKeys = useMemo(
    () =>
      components
        .filter((component) => component.type === 'field')
        .map((component) => component.value),
    [components],
  );

  const duplicateKeys = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    fieldKeys.forEach((key) => {
      if (!key) return;
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    });
    return dupes;
  }, [fieldKeys]);

  const hasDuplicates = duplicateKeys.size > 0;
  const allFieldsChosen = fieldKeys.length >= 2 && fieldKeys.every(Boolean);
  const valid = Boolean(destinationField) && allFieldsChosen && !hasDuplicates;

  const validationMessage = useMemo(() => {
    if (!destinationField) return 'Select a target destination field';
    if (fieldKeys.length < 2) return 'Add at least 2 source fields to combine';
    if (fieldKeys.some((k) => !k)) return 'Choose a source field for every slot';
    if (hasDuplicates) return 'Duplicate source field selected in pipeline';
    return null;
  }, [destinationField, fieldKeys, hasDuplicates]);

  const config = useMemo<CombineConfig>(
    () => ({
      type: 'combine',
      name: name.trim() || undefined,
      separator,
      customSeparator: separator === 'custom' ? customSeparator : undefined,
      components,
    }),
    [name, separator, customSeparator, components],
  );

  const updateField = (index: number, value: string) => {
    setComponents((current) =>
      current.map((c, at) => (at === index ? { type: 'field', value } : c)),
    );
  };

  const removeField = (index: number) => {
    setComponents((current) => current.filter((_, at) => at !== index));
  };

  const addField = () => {
    // Pick the first unselected source field if available
    const selected = new Set(fieldKeys);
    const available = sourceFields.find((f) => !selected.has(f.key));
    setComponents((current) => [
      ...current,
      { type: 'field', value: available ? available.key : '' },
    ]);
  };

  // Preview combined output
  const previewResult = useMemo(() => {
    if (!fieldKeys.length || fieldKeys.some((k) => !k)) return null;
    return previewCombinedFields(config, samples);
  }, [config, samples, fieldKeys]);

  const generatedDefaultName = useMemo(() => {
    const sourceNames = fieldKeys
      .filter(Boolean)
      .map((k) => sourceFields.find((f) => f.key === k)?.label || k);
    if (sourceNames.length >= 2) {
      const destDef = destinationFields.find((f) => f.key === destinationField);
      const destName = destDef?.label || destinationField;
      return destName
        ? `${sourceNames.join(' + ')} ➔ ${destName}`
        : sourceNames.join(' + ');
    }
    return 'e.g. First Name + Last Name ➔ Full Name';
  }, [fieldKeys, destinationField, sourceFields, destinationFields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        padding="none"
        className="flex max-h-[88vh] w-full flex-col gap-0 p-0 overflow-hidden sm:max-w-[920px] border border-border rounded-xl bg-card"
      >
        {/* Fixed Header */}
        <DialogHeader className="bg-background shrink-0 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-muted-foreground text-[11px] font-medium"
            >
              Field Transform
            </Badge>
            {fieldKeys.length > 0 && (
              <Badge className="border-0 bg-primary/10 text-primary text-[11px] font-semibold">
                {fieldKeys.length} Source Field{fieldKeys.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-foreground mt-1 flex items-center gap-2 text-base font-semibold">
            <Layers className="text-primary size-5" />
            Combine Multiple Fields
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Merge multiple source fields in defined order with a custom separator into one destination field.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body: 2-Column Responsive Layout */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5 items-start">
            {/* Left Column: Configuration Controls */}
            <div className="space-y-3.5">
              {/* 1. Target Destination Field */}
              <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="combine-dest-select"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <ArrowRight className="size-3.5 text-primary" />
                    <span>Target Destination Field:</span>
                  </Label>
                  {destinationField && (
                    <Badge className="border-0 bg-primary/10 text-primary text-[10px] font-mono">
                      Mapped Target
                    </Badge>
                  )}
                </div>
                <Select
                  value={destinationField}
                  onValueChange={setDestinationField}
                >
                  <SelectTrigger
                    id="combine-dest-select"
                    size="sm"
                    aria-label="Select destination field"
                    className="h-8 text-xs w-full bg-background border-border rounded-xl"
                  >
                    <SelectValue placeholder="Select destination field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationFields
                      .filter((field) => !field.readOnly)
                      .map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-medium">
                              {field.label ?? field.key}
                            </span>
                            <div className="flex items-center gap-1">
                              {field.required && (
                                <Badge className="border-0 bg-destructive/15 text-destructive text-[9px] px-1 py-0">
                                  Req
                                </Badge>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                {field.type || 'text'}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Source Fields in Order (Draggable Pipeline) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    <span>Source Fields in Sequence:</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Drag cards to reorder
                  </span>
                </div>

                <div className="space-y-1.5">
                  {components.map((component, index) => {
                    const isDupe =
                      component.value &&
                      duplicateKeys.has(component.value);
                    const isBeingDragged = draggedIndex === index;
                    const isDragOver =
                      dragOverIndex === index && draggedIndex !== index;

                    return (
                      <div
                        key={`field-part-${index}`}
                        data-testid={`combine-field-item-${index}`}
                        draggable={true}
                        onDragStart={(e) => {
                          const target = e.target as HTMLElement;
                          if (
                            target.closest(
                              'button:not([data-drag-handle]), [role="combobox"], [data-slot="select-trigger"]',
                            )
                          ) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                          setDraggedIndex(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverIndex !== index) {
                            setDragOverIndex(index);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
                            if (dragOverIndex === index) {
                              setDragOverIndex(null);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceIdxStr =
                            e.dataTransfer.getData('text/plain');
                          const sourceIdx =
                            sourceIdxStr !== ''
                              ? Number(sourceIdxStr)
                              : draggedIndex;
                          if (
                            sourceIdx !== null &&
                            sourceIdx !== undefined &&
                            !isNaN(sourceIdx) &&
                            sourceIdx !== index
                          ) {
                            setComponents((prev) => {
                              const next = [...prev];
                              const [moved] = next.splice(sourceIdx, 1);
                              next.splice(index, 0, moved);
                              return next;
                            });
                          }
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border p-1.5 transition-colors bg-card select-none',
                          isBeingDragged &&
                            'opacity-40 border-dashed border-primary bg-primary/5',
                          isDragOver &&
                            'border-primary ring-1 ring-primary/40 bg-accent/20',
                          !isBeingDragged &&
                            !isDragOver &&
                            'border-border hover:border-border/80',
                          isDupe && 'border-destructive/50 bg-destructive/5',
                        )}
                      >
                        {/* Drag Handle */}
                        <div
                          data-drag-handle="true"
                          aria-label={`Drag to reorder field ${index + 1}`}
                          title="Drag to reorder"
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 shrink-0 rounded-lg hover:bg-muted transition-colors"
                        >
                          <GripVertical className="size-4" />
                        </div>

                        {/* Order Badge */}
                        <Badge
                          variant="secondary"
                          className="size-5.5 p-0 rounded-md font-mono text-[10px] font-semibold flex items-center justify-center shrink-0 border-0"
                        >
                          #{index + 1}
                        </Badge>

                        {/* Field Selector */}
                        <div className="flex-1 min-w-0">
                          <Select
                            value={component.value}
                            onValueChange={(val) => updateField(index, val)}
                          >
                            <SelectTrigger
                              size="sm"
                              aria-label={`Source field ${index + 1}`}
                              className={cn(
                                'h-8 text-xs w-full bg-background border-border rounded-xl',
                                isDupe && 'border-destructive text-destructive',
                              )}
                            >
                              <SelectValue placeholder="Choose source field…" />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  <div className="flex items-center justify-between gap-3 w-full">
                                    <span className="truncate">
                                      {field.label ?? field.key}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                      {field.type || 'text'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remove Action */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={components.length <= 2}
                          onClick={() => removeField(index)}
                          aria-label={`Remove field ${index + 1}`}
                          className="size-7 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30 shrink-0 rounded-lg"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addField}
                  className="w-full text-xs gap-1.5 h-8 border-dashed border-border hover:border-primary hover:text-primary transition-colors cursor-pointer rounded-xl"
                >
                  <Plus className="size-3.5 text-primary" />
                  <span>Add Source Field</span>
                </Button>
              </div>

              {/* 3. Separator Presets */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Separator between fields:
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {separator === 'custom'
                      ? customSeparator
                        ? `"${customSeparator}"`
                        : 'Custom'
                      : SEPARATOR_PRESETS.find((s) => s.id === separator)
                          ?.preview}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SEPARATOR_PRESETS.map((preset) => {
                    const isSelected = separator === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSeparator(preset.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer select-none flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border',
                        )}
                      >
                        <span>{preset.label}</span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'text-[10px] font-mono px-1.5 py-0.2 rounded-md font-normal',
                            isSelected
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'text-muted-foreground/80',
                          )}
                        >
                          {preset.preview}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {separator === 'custom' && (
                  <div className="pt-1 flex items-center gap-2">
                    <Input
                      uiSize="sm"
                      aria-label="Custom separator"
                      value={customSeparator}
                      onChange={(e) => setCustomSeparator(e.target.value)}
                      placeholder='e.g. " _ " or " | " or " - "'
                      className="h-8 text-xs font-mono max-w-[180px] bg-background border-border rounded-xl"
                      autoFocus
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Custom character sequence
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Mapping Name (Optional) */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="combine-mapping-name"
                    className="text-xs font-semibold text-foreground"
                  >
                    Mapping Name{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                    :
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Auto-generated if left blank
                  </span>
                </div>
                <Input
                  uiSize="sm"
                  id="combine-mapping-name"
                  aria-label="Mapping name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={generatedDefaultName}
                  maxLength={120}
                  className="h-8 text-xs font-normal bg-background border-border rounded-xl"
                />
              </div>
            </div>

            {/* Right Column: Live Interactive Combined Preview */}
            <div className="bg-muted/30 border border-border rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="size-6.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Live Combined Preview
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Interactive output trace
                    </p>
                  </div>
                </div>
                <Badge className="border-0 bg-primary/10 text-primary text-[10px] font-mono font-medium">
                  Live Sandbox
                </Badge>
              </div>

              {/* Visual Formula Token Chain (Flex-Wrap, theme tokens, no shadows) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Combination Chain:
                  </span>
                  {fieldKeys.filter(Boolean).length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {fieldKeys.filter(Boolean).length} parts
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-background border border-border rounded-xl text-xs font-mono">
                  {fieldKeys.filter(Boolean).length === 0 ? (
                    <span className="text-muted-foreground italic text-xs">
                      No source fields selected
                    </span>
                  ) : (
                    <>
                      {fieldKeys
                        .filter(Boolean)
                        .map((key, i, arr) => {
                          const fieldDef = sourceFields.find(
                            (f) => f.key === key,
                          );
                          const fieldName = fieldDef?.label || key;
                          const sepLabel =
                            separator === 'custom'
                              ? customSeparator || '…'
                              : SEPARATOR_PRESETS.find(
                                  (s) => s.id === separator,
                                )?.label || 'Space';
                          return (
                            <div
                              key={key + i}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Badge
                                variant="secondary"
                                className="border-0 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-lg"
                              >
                                <span className="text-[10px] opacity-70">
                                  #{i + 1}
                                </span>
                                <span>{fieldName}</span>
                              </Badge>
                              {i < arr.length - 1 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                  {sepLabel}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      {destinationField && (
                        <div className="inline-flex items-center gap-1.5">
                          <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                          <Badge
                            variant="secondary"
                            className="border-0 bg-success/15 text-success text-xs font-semibold px-2 py-0.5 rounded-lg"
                          >
                            <span>
                              {destinationFields.find(
                                (f) => f.key === destinationField,
                              )?.label || destinationField}
                            </span>
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Live Result Output Box (Theme tokens, flat, no shadows) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Resulting Destination Value:
                  </span>
                  {previewResult && (
                    <span className="text-[10px] text-success font-medium">
                      ● Live Synced
                    </span>
                  )}
                </div>
                <div
                  aria-live="polite"
                  className="bg-background rounded-xl border border-border p-2.5 min-h-[44px] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    {previewResult ? (
                      <span className="text-xs font-semibold text-foreground font-mono break-all select-all">
                        {previewResult}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {fieldKeys.length < 2
                          ? 'Select at least 2 source fields'
                          : 'Enter test values below to preview'}
                      </span>
                    )}
                  </div>
                  {previewResult && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className="border-0 bg-success/15 text-success text-[10px] font-medium">
                        Live Output
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(previewResult);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        title="Copy to clipboard"
                        aria-label="Copy preview result"
                        className="size-6.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {copied ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Input Values for Interactive Testing */}
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Test with Sample Values:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextSamples: Record<string, string> = {};
                        fieldKeys.forEach((k) => {
                          const def = sourceFields.find((f) => f.key === k);
                          const lower = (def?.label || k).toLowerCase();
                          if (lower.includes('first')) nextSamples[k] = 'Jane';
                          else if (lower.includes('last')) nextSamples[k] = 'Doe';
                          else if (lower.includes('city'))
                            nextSamples[k] = 'Chicago';
                          else if (lower.includes('state')) nextSamples[k] = 'IL';
                          else if (
                            lower.includes('street') ||
                            lower.includes('address')
                          )
                            nextSamples[k] = '123 Market St';
                          else if (
                            lower.includes('zip') ||
                            lower.includes('postal')
                          )
                            nextSamples[k] = '60601';
                          else nextSamples[k] = def?.label || k;
                        });
                        setSamples(nextSamples);
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                    >
                      Fill sample data
                    </button>
                    {Object.keys(samples).length > 0 && (
                      <>
                        <span className="text-border">|</span>
                        <button
                          type="button"
                          onClick={() => setSamples({})}
                          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                  {fieldKeys.filter(Boolean).map((key, i) => {
                    const field = sourceFields.find((f) => f.key === key);
                    const label = field?.label || key;
                    return (
                      <div
                        key={key + i}
                        className="grid grid-cols-[100px_1fr] items-center gap-2"
                      >
                        <Label
                          htmlFor={`sample-input-${key}-${i}`}
                          className="text-xs font-medium text-muted-foreground truncate"
                          title={label}
                        >
                          {label}:
                        </Label>
                        <Input
                          uiSize="sm"
                          id={`sample-input-${key}-${i}`}
                          aria-label={`Preview value for ${label}`}
                          value={samples[key] ?? ''}
                          onChange={(e) =>
                            setSamples((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${label}…`}
                          className="h-8 text-xs bg-background border-border rounded-xl"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="bg-muted/30 shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {valid ? (
              <span className="text-success text-xs flex items-center gap-1 font-medium">
                <Check className="size-3.5" />
                <span>Ready to combine</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <AlertCircle className="size-3.5 text-muted-foreground" />
                <span>{validationMessage}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!valid}
              onClick={() => {
                onApply(destinationField, config);
                onOpenChange(false);
              }}
            >
              {initial ? 'Save combined mapping' : 'Add combined mapping'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
