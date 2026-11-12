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
import { REQUIRED_RULE_PARAMS } from '@/lib/ruleValidation';
import type { PipelineStep } from '@/lib/transformRules.shared';

import {
  IfConditionEditor,
  LegacyConditionNotice,
  RuleParamInput,
  StepResult,
  convertLegacyCondition,
  isLegacyCondition,
} from './RuleCardParts';

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
  pattern: 'Pattern',
  format: 'Format',
  tz: 'Timezone',
  days: 'Days',
  decimals: 'Decimals',
  currency: 'Currency',
  delimiter: 'Delimiter',
  index: 'Position',
  action: 'Action',
  map: 'Value mapping',
  fallback: 'If not listed',
  operator: 'Condition',
  thenAction: 'Then',
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
  showErrors,
}: {
  rule: Rule;
  destOptions?: { value: string; label: string }[];
  onUpdate: (rule: Rule) => void;
  showErrors: boolean;
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
      <p className="text-muted-foreground text-[10px]">
        Source value <span className="text-destructive">*</span> → Destination
        value (optional)
      </p>
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
            className="h-8 flex-1 font-mono text-xs"
            aria-invalid={showErrors && !from.trim()}
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
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
              className="h-8 flex-1 font-mono text-xs"
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
        className="h-7 self-start text-xs"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus className="mr-1 size-3" /> Add Value Pair
      </Button>
    </div>
  );
}

function ValueMappingEditor({
  rule,
  destOptions,
  onUpdate,
  showErrors,
}: {
  rule: Rule;
  destOptions?: { value: string; label: string }[];
  onUpdate: (rule: Rule) => void;
  showErrors: boolean;
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
        <label className="flex cursor-pointer items-center gap-1.5">
          <Switch
            checked={!!norm.trim}
            onCheckedChange={(v) => setNorm({ trim: v })}
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">Trim</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <Switch
            checked={!!norm.lowercase}
            onCheckedChange={(v) => setNorm({ lowercase: v })}
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">Lowercase</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <Switch
            checked={!!norm.replaceUnderscoreAndHyphenWithSpace}
            onCheckedChange={(v) =>
              setNorm({ replaceUnderscoreAndHyphenWithSpace: v })
            }
            className="scale-90"
          />
          <span className="text-muted-foreground text-[11px]">
            _ / - to space
          </span>
        </label>
      </div>

      {entries.map(([from, to], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={from}
            onChange={(e) => renameKey(i, e.target.value)}
            placeholder="Source value"
            className="h-8 flex-1 font-mono text-xs"
            aria-invalid={showErrors && !from.trim()}
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger
                className="h-8 flex-1 text-xs"
                aria-invalid={showErrors && !to.trim()}
              >
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
              className="h-8 flex-1 font-mono text-xs"
              aria-invalid={showErrors && !to.trim()}
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
        className="h-7 self-start text-xs"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus className="mr-1 size-3" /> Add Value Pair
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
  errors,
  step,
}: {
  step?: PipelineStep;
  rule: Rule;
  index: number;
  onUpdate: (index: number, rule: Rule) => void;
  onRemove: (index: number) => void;
  destOptions?: { value: string; label: string }[];
  dragHandleProps: DraggableProvided['dragHandleProps'];
  isDragging: boolean;
  errors: string[];
}) {
  const def: RuleDefinition | undefined = RULE_DEFINITIONS.find(
    (r) => r.type === rule.type,
  );
  const isCondition = rule.type === 'if_condition';
  const isLegacy = isLegacyCondition(rule.type);
  const inlineParams = isCondition
    ? []
    : (def?.params ?? []).filter((p) => p !== 'map');
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
        'bg-card rounded-xl border transition-all',
        !isEnabled
          ? 'border-border/60 bg-muted/20 opacity-60'
          : 'border-border/80 shadow-2xs',
        isDragging && 'ring-primary/40 bg-background shadow-md ring-2',
        errors.length > 0 && 'border-destructive ring-destructive/20 ring-1',
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

        <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-xs font-semibold">
            {def?.label || rule.type}
          </p>
          {def?.description && (
            <p className="text-muted-foreground truncate text-[10px] leading-tight">
              {def.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {errors.length > 0 && (
            <AlertCircle
              className="text-destructive size-4"
              aria-label="Rule needs required values"
            />
          )}
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

      {isLegacy && (
        <LegacyConditionNotice
          onConvert={() => onUpdate(index, convertLegacyCondition(rule))}
        />
      )}

      {isCondition && isEnabled && (
        <IfConditionEditor
          rule={rule}
          errors={errors}
          onUpdate={(next) => onUpdate(index, next)}
        />
      )}

      {hasParams && isEnabled && !isLegacy && !isCondition && (
        <div className="grid gap-x-3 gap-y-2 px-8 pt-1 pb-2.5 sm:grid-cols-2">
          {(isValueMap ? ['fallback'] : inlineParams).map((p) => (
            <RuleParamInput
              key={p}
              ruleType={rule.type}
              param={p}
              label={PARAM_LABELS[p] || p}
              value={String(rule[p] ?? '')}
              required={(REQUIRED_RULE_PARAMS[rule.type] || []).includes(p)}
              invalid={errors.includes(p)}
              onChange={(value) => handleParamChange(p, value)}
            />
          ))}
        </div>
      )}

      <StepResult step={step} />

      {isValueMap && isEnabled && (
        <ValueMapEditor
          rule={rule}
          destOptions={destOptions}
          onUpdate={(next) => onUpdate(index, next)}
          showErrors={errors.includes('map')}
        />
      )}

      {isValueMapping && isEnabled && (
        <ValueMappingEditor
          rule={rule}
          destOptions={destOptions}
          onUpdate={(next) => onUpdate(index, next)}
          showErrors={errors.includes('map')}
        />
      )}
      {errors.length > 0 && (
        <div className="text-destructive px-8 pb-3 text-[11px]" role="alert">
          {errors.map((param) => (
            <p key={param}>
              {param === 'map'
                ? rule.type === 'value_map'
                  ? 'Add a value pair and fill every source value.'
                  : 'Complete every source and destination value.'
                : (rule.type === 'min_length' || rule.type === 'max_length') &&
                    param === 'value' &&
                    String(rule.value ?? '').trim()
                  ? 'Value must be a non-negative whole number.'
                  : `${PARAM_LABELS[param] || param} is required.`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export interface DraggableRulePipelineProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  destOptions?: { value: string; label: string }[];
  className?: string;
  validationErrors?: Record<number, string[]>;
  /** Live preview trace, one step per rule, shown on each card. */
  trace?: PipelineStep[];
}

export default function DraggableRulePipeline({
  rules,
  onRulesChange,
  destOptions,
  className,
  validationErrors = {},
  trace,
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
    return null;
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
                      data-rule-index={idx}
                    >
                      <ActiveRuleCard
                        rule={rule}
                        index={idx}
                        onUpdate={updateRule}
                        onRemove={removeRule}
                        destOptions={destOptions}
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                        errors={validationErrors[idx] ?? []}
                        step={trace?.[idx]}
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
