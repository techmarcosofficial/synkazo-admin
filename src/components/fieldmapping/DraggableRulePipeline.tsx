import type { DraggableProvided, DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  AlertCircle,
  ArrowRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RULE_DEFINITIONS,
  type Rule,
  type RuleDefinition,
} from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';

export const REQUIRED_PARAMS: Record<string, string[]> = {
  replace: ['find'],
  remove_text: ['find'],
  prefix: ['value'],
  suffix: ['value'],
  regex_replace: ['pattern'],
  char_limit: ['value'],
  word_limit: ['value'],
  min_length: ['value'],
  max_length: ['value'],
  skip_if_equals: ['value'],
  skip_if_contains: ['find'],
  replace_if_contains: ['find'],
  if_starts_with: ['value'],
  if_ends_with: ['value'],
  if_matches_regex: ['pattern'],
  round: ['decimals'],
  decimal_format: ['decimals'],
  currency_format: ['currency'],
  math_add: ['value'],
  math_subtract: ['value'],
  math_multiply: ['value'],
  math_divide: ['value'],
  date_format: ['format'],
  date_add: ['days'],
  date_subtract: ['days'],
  split_by_space: ['index'],
  split_by_delimiter: ['delimiter'],
  value_map: ['map'],
  value_mapping: ['map'],
};

export const NUMERIC_VALUE_RULES = new Set([
  'char_limit',
  'word_limit',
  'min_length',
  'max_length',
  'math_add',
  'math_subtract',
  'math_multiply',
  'math_divide',
  'round',
  'decimal_format',
  'date_add',
  'date_subtract',
  'split_by_space',
]);

export const PARAM_LABELS: Record<string, string> = {
  find: 'Find',
  replacement: 'Replace with',
  value: 'Value',
  pattern: 'Regex',
  format: 'Format',
  tz: 'Timezone',
  days: 'Days',
  decimals: 'Decimals',
  currency: 'Currency',
  delimiter: 'Delimiter',
  index: 'Index',
  action: 'Action',
  map: 'Value mapping',
  fallback: 'If not listed',
  defaultValue: 'Default value',
};

function isParamNumeric(ruleType: string, paramKey: string): boolean {
  if (paramKey === 'decimals' || paramKey === 'days' || paramKey === 'index')
    return true;
  if (paramKey === 'value' && NUMERIC_VALUE_RULES.has(ruleType)) return true;
  return false;
}

function ValueMapEditor({
  rule,
  destOptions,
  onUpdate,
}: {
  rule: Rule;
  destOptions?: { value: string; label: string }[];
  onUpdate: (rule: Rule) => void;
}) {
  const map = (rule.map ?? {}) as Record<string, string>;
  const entries = Object.entries(map);

  const writeEntries = (next: [string, string][]) =>
    onUpdate({ ...rule, map: Object.fromEntries(next) });

  const renameKey = (index: number, key: string) => {
    const next = entries.map((e, i) => (i === index ? [key, e[1]] : e)) as [
      string,
      string,
    ][];
    writeEntries(next);
  };

  const setValue = (index: number, value: string) => {
    const next = entries.map((e, i) => (i === index ? [e[0], value] : e)) as [
      string,
      string,
    ][];
    writeEntries(next);
  };

  return (
    <div className="flex flex-col gap-2 px-10 pt-1 pb-3">
      {entries.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No values mapped yet. Add a rule for each source value to convert.
        </p>
      )}
      {entries.map(([from, to], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={from}
            onChange={(e) => renameKey(i, e.target.value)}
            placeholder="Source value"
            className="flex-1 font-mono text-xs h-8"
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger className="flex-1 text-xs h-8">
                <SelectValue placeholder="Destination option" />
              </SelectTrigger>
              <SelectContent>
                {destOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label || o.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={to}
              onChange={(e) => setValue(i, e.target.value)}
              placeholder="Destination value"
              className="flex-1 font-mono text-xs h-8"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove value mapping"
            className="text-muted-foreground hover:text-destructive size-7"
            onClick={() =>
              writeEntries(
                entries.filter((_, j) => j !== i) as [string, string][],
              )
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="self-start text-xs h-7"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus className="size-3 mr-1" /> Add Value Pair
      </Button>
    </div>
  );
}

function ValueMappingEditor({
  rule,
  destOptions,
  onUpdate,
}: {
  rule: Rule;
  destOptions?: { value: string; label: string }[];
  onUpdate: (rule: Rule) => void;
}) {
  const map = (rule.map ?? {}) as Record<string, string>;
  const entries = Object.entries(map);
  const norm = rule.normalization ?? {};

  const writeEntries = (next: [string, string][]) =>
    onUpdate({ ...rule, map: Object.fromEntries(next) });

  const renameKey = (index: number, key: string) => {
    const next = entries.map((e, i) => (i === index ? [key, e[1]] : e)) as [
      string,
      string,
    ][];
    writeEntries(next);
  };

  const setValue = (index: number, value: string) => {
    const next = entries.map((e, i) => (i === index ? [e[0], value] : e)) as [
      string,
      string,
    ][];
    writeEntries(next);
  };

  const setNorm = (patch: Partial<typeof norm>) =>
    onUpdate({ ...rule, normalization: { ...norm, ...patch } });

  return (
    <div className="flex flex-col gap-2 px-10 pt-1 pb-3">
      <div className="flex flex-wrap items-center gap-3 pb-1 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch
            checked={!!norm.trim}
            onCheckedChange={(v) => setNorm({ trim: v })}
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">Trim</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch
            checked={!!norm.lowercase}
            onCheckedChange={(v) => setNorm({ lowercase: v })}
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">Lowercase</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch
            checked={!!norm.replaceUnderscoreAndHyphenWithSpace}
            onCheckedChange={(v) =>
              setNorm({ replaceUnderscoreAndHyphenWithSpace: v })
            }
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">_ / - to space</span>
        </label>
      </div>

      {entries.map(([from, to], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={from}
            onChange={(e) => renameKey(i, e.target.value)}
            placeholder="Source value"
            className="flex-1 font-mono text-xs h-8"
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger className="flex-1 text-xs h-8">
                <SelectValue placeholder="Destination option" />
              </SelectTrigger>
              <SelectContent>
                {destOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label || o.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={to}
              onChange={(e) => setValue(i, e.target.value)}
              placeholder="Destination value"
              className="flex-1 font-mono text-xs h-8"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove value mapping"
            className="text-muted-foreground hover:text-destructive size-7"
            onClick={() =>
              writeEntries(
                entries.filter((_, j) => j !== i) as [string, string][],
              )
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="self-start text-xs h-7"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus className="size-3 mr-1" /> Add Value Pair
      </Button>
    </div>
  );
}

function ActiveRuleCard({
  rule,
  index,
  onUpdate,
  onRemove,
  destOptions,
  dragHandleProps,
  isDragging,
}: {
  rule: Rule;
  index: number;
  onUpdate: (index: number, rule: Rule) => void;
  onRemove: (index: number) => void;
  destOptions?: { value: string; label: string }[];
  dragHandleProps: DraggableProvided['dragHandleProps'];
  isDragging: boolean;
}) {
  const def: RuleDefinition | undefined = RULE_DEFINITIONS.find(
    (r) => r.type === rule.type,
  );
  const inlineParams = (def?.params ?? []).filter((p) => p !== 'map');
  const isValueMap = rule.type === 'value_map';
  const isValueMapping = rule.type === 'value_mapping';
  const hasParams = inlineParams.length > 0 || isValueMap || isValueMapping;
  const isEnabled = rule.enabled !== false;

  const handleParamChange = (paramKey: string, rawValue: string) => {
    let val = rawValue;
    if (isParamNumeric(rule.type, paramKey)) {
      val = rawValue.replace(/[^0-9.\-]/g, '');
    }
    onUpdate(index, { ...rule, [paramKey]: val });
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-all',
        !isEnabled ? 'border-border/60 opacity-60 bg-muted/20' : 'border-border/80 shadow-2xs',
        isDragging && 'ring-primary/40 ring-2 shadow-md bg-background',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          {...dragHandleProps}
          className="text-muted-foreground hover:bg-muted focus-visible:ring-ring/30 flex size-6 shrink-0 cursor-grab items-center justify-center rounded-lg outline-none focus-visible:ring-2 active:cursor-grabbing"
          aria-label={`Drag to reorder ${def?.label || rule.type} rule`}
        >
          <GripVertical className="size-3.5" />
        </button>

        <span className="bg-primary/10 text-primary font-bold flex size-5 shrink-0 items-center justify-center rounded-lg text-[10px]">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {def?.label || rule.type}
          </p>
          {def?.description && (
            <p className="text-[10px] text-muted-foreground truncate leading-tight">
              {def.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) =>
              onUpdate(index, { ...rule, enabled: checked })
            }
            className="scale-90"
            aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${def?.label || rule.type}`}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive size-7"
            aria-label={`Delete ${def?.label || rule.type} rule`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {hasParams && isEnabled && (
        <div className="grid gap-2 px-8 pb-2 pt-1 sm:grid-cols-2">
          {(isValueMap ? ['fallback'] : inlineParams).map((p) => {
            const isRequired = (REQUIRED_PARAMS[rule.type] || []).includes(p);
            const isNum = isParamNumeric(rule.type, p);

            return (
              <label key={p} className="min-w-0 space-y-0.5">
                <span className="text-muted-foreground text-[10px] font-medium">
                  {PARAM_LABELS[p] || p} {isRequired && '*'}
                </span>
                <Input
                  value={(rule[p] as string) || ''}
                  onChange={(e) => handleParamChange(p, e.target.value)}
                  placeholder={
                    p === 'fallback'
                      ? 'Pass through'
                      : isRequired
                        ? 'Required'
                        : 'Optional'
                  }
                  inputMode={isNum ? 'decimal' : 'text'}
                  className="h-7 text-xs font-mono"
                />
              </label>
            );
          })}
        </div>
      )}

      {isValueMap && isEnabled && (
        <ValueMapEditor
          rule={rule}
          destOptions={destOptions}
          onUpdate={(next) => onUpdate(index, next)}
        />
      )}

      {isValueMapping && isEnabled && (
        <ValueMappingEditor
          rule={rule}
          destOptions={destOptions}
          onUpdate={(next) => onUpdate(index, next)}
        />
      )}
    </div>
  );
}

export interface DraggableRulePipelineProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  destOptions?: { value: string; label: string }[];
  className?: string;
}

export default function DraggableRulePipeline({
  rules,
  onRulesChange,
  destOptions,
  className,
}: DraggableRulePipelineProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;

    const reordered = Array.from(rules);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onRulesChange(reordered);
  };

  const updateRule = (index: number, updated: Rule) => {
    const next = [...rules];
    next[index] = updated;
    onRulesChange(next);
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-3.5 text-center text-xs text-muted-foreground space-y-0.5">
        <p className="font-medium text-foreground">No transformation rules applied yet</p>
        <p className="text-[11px] text-muted-foreground">
          Use the quick presets above or click below to add a custom rule.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="unified-field-workbench-pipeline">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-1.5"
            >
              {rules.map((rule, idx) => (
                <Draggable
                  key={`${rule.type}-${idx}`}
                  draggableId={`${rule.type}-${idx}`}
                  index={idx}
                >
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      style={dragProvided.draggableProps.style}
                    >
                      <ActiveRuleCard
                        rule={rule}
                        index={idx}
                        onUpdate={updateRule}
                        onRemove={removeRule}
                        destOptions={destOptions}
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
