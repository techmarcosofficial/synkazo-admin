import { ArrowRight, CircleSlash, Info, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Rule } from '@/lib/ruleEngine';
import { paramGuide } from '@/lib/ruleGuide';
import {
  VALUE_OPERATORS,
  type PipelineStep,
} from '@/lib/transformRules.shared';
import { cn } from '@/lib/utils';

const CUSTOM = '__custom__';

/** Shows a value the way it will be written: quotes make spaces visible. */
export function ShownValue({ value }: { value: string }) {
  if (value === '') {
    return <span className="text-muted-foreground italic">(empty)</span>;
  }
  return (
    <span className="bg-muted/70 text-foreground rounded px-1 font-mono whitespace-pre">
      {value}
    </span>
  );
}

/** One input of a rule, with its placeholder, hint and fixed choices. */
export function RuleParamInput({
  ruleType,
  param,
  label,
  value,
  required,
  invalid,
  onChange,
}: {
  ruleType: string;
  param: string;
  label: string;
  value: string;
  required: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const guide = paramGuide(ruleType, param);
  const id = `rule-${ruleType}-${param}`;
  const inList = guide.options?.some((o) => o.value === value);
  const [custom, setCustom] = useState(
    Boolean(guide.allowCustom && value && !inList),
  );

  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-muted-foreground text-[11px] font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {guide.options && !custom ? (
        <Select
          value={inList ? value : ''}
          onValueChange={(next) => {
            if (next === CUSTOM) {
              setCustom(true);
              return;
            }
            onChange(next);
          }}
        >
          <SelectTrigger
            id={id}
            size="sm"
            className="h-8 w-full text-xs"
            aria-invalid={invalid}
          >
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {guide.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {guide.allowCustom && (
              <SelectItem value={CUSTOM}>Custom…</SelectItem>
            )}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            value={value}
            onChange={(e) =>
              onChange(
                guide.numeric
                  ? e.target.value.replace(/[^0-9.\-]/g, '')
                  : e.target.value,
              )
            }
            placeholder={guide.placeholder ? `e.g. ${guide.placeholder}` : undefined}
            inputMode={guide.numeric ? 'decimal' : 'text'}
            className="h-8 font-mono text-xs"
            aria-invalid={invalid}
          />
          {custom && guide.options && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-[11px]"
              onClick={() => setCustom(false)}
            >
              Presets
            </Button>
          )}
        </div>
      )}
      {guide.hint && (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {guide.hint}
        </p>
      )}
    </div>
  );
}

const OPERATORS: Array<{ value: string; label: string }> = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'gt', label: 'is greater than' },
  { value: 'lt', label: 'is less than' },
  { value: 'matches', label: 'matches pattern' },
];

const THEN_ACTIONS = [
  { value: 'set', label: 'set it to' },
  { value: 'skip_field', label: 'skip this field' },
  { value: 'skip_record', label: 'skip the whole record' },
];

const ELSE_ACTIONS = [
  { value: 'keep', label: 'keep the value' },
  { value: 'set', label: 'set it to' },
  { value: 'skip_field', label: 'skip this field' },
];

/** If → then, written as a sentence: If value [equals] [Yes] then [set it to] [true]. */
export function IfConditionEditor({
  rule,
  onUpdate,
  errors,
}: {
  rule: Rule;
  onUpdate: (rule: Rule) => void;
  errors: string[];
}) {
  const operator = String(rule.operator ?? '');
  const thenAction = String(rule.thenAction ?? '');
  const elseAction = String(rule.elseAction ?? 'keep');
  const needsValue = VALUE_OPERATORS.has(operator);
  const set = (patch: Partial<Rule>) => onUpdate({ ...rule, ...patch });
  const field = 'h-8 text-xs';

  return (
    <div className="space-y-2 px-8 pt-1 pb-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground w-16 shrink-0 font-medium">If value</span>
        <Select value={operator} onValueChange={(v) => set({ operator: v })}>
          <SelectTrigger
            size="sm"
            className={cn(field, 'w-40')}
            aria-label="Condition"
            aria-invalid={errors.includes('operator')}
          >
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {needsValue && (
          <Input
            value={String(rule.value ?? '')}
            onChange={(e) => set({ value: e.target.value })}
            placeholder={
              operator === 'matches'
                ? 'e.g. ^\\d{5}$'
                : operator === 'gt' || operator === 'lt'
                  ? 'e.g. 1000'
                  : 'e.g. test'
            }
            aria-label="Compare to"
            aria-invalid={errors.includes('value')}
            className={cn(field, 'w-40 font-mono')}
          />
        )}
        {needsValue && operator !== 'gt' && operator !== 'lt' && (
          <label className="text-muted-foreground flex items-center gap-1.5">
            <Checkbox
              checked={rule.ignoreCase === true}
              onCheckedChange={(c) => set({ ignoreCase: c === true })}
            />
            Ignore case
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground w-16 shrink-0 font-medium">then</span>
        <Select value={thenAction} onValueChange={(v) => set({ thenAction: v })}>
          <SelectTrigger
            size="sm"
            className={cn(field, 'w-44')}
            aria-label="Then"
            aria-invalid={errors.includes('thenAction')}
          >
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {THEN_ACTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {thenAction === 'set' && (
          <Input
            value={String(rule.thenValue ?? '')}
            onChange={(e) => set({ thenValue: e.target.value })}
            placeholder="e.g. true"
            aria-label="Then set it to"
            className={cn(field, 'w-40 font-mono')}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground w-16 shrink-0 font-medium">otherwise</span>
        <Select value={elseAction} onValueChange={(v) => set({ elseAction: v })}>
          <SelectTrigger size="sm" className={cn(field, 'w-44')} aria-label="Otherwise">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ELSE_ACTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {elseAction === 'set' && (
          <Input
            value={String(rule.elseValue ?? '')}
            onChange={(e) => set({ elseValue: e.target.value })}
            placeholder="e.g. false"
            aria-label="Otherwise set it to"
            className={cn(field, 'w-40 font-mono')}
          />
        )}
      </div>
    </div>
  );
}

const LEGACY_TO_OPERATOR: Record<string, string> = {
  if_starts_with: 'starts_with',
  if_ends_with: 'ends_with',
  if_matches_regex: 'matches',
};

export function isLegacyCondition(type: string) {
  return type in LEGACY_TO_OPERATOR;
}

/** The working If → Then version of an older If Starts With / Ends With / Matches rule. */
export function convertLegacyCondition(rule: Rule): Rule {
  const action = String(rule.action ?? '');
  return {
    type: 'if_condition',
    enabled: rule.enabled,
    operator: LEGACY_TO_OPERATOR[rule.type],
    value: String(
      (rule.type === 'if_matches_regex' ? rule.pattern : rule.value) ?? '',
    ),
    thenAction: action ? 'set' : '',
    thenValue: action,
    elseAction: 'keep',
  };
}

export function LegacyConditionNotice({ onConvert }: { onConvert: () => void }) {
  return (
    <div className="border-warning/30 bg-warning/10 mx-8 mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-[11px]">
      <Info className="text-warning size-3.5 shrink-0" aria-hidden="true" />
      <span className="text-foreground min-w-0 flex-1">
        This older rule never changed values during a sync. Convert it to If →
        Then to make it work.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-[11px]"
        onClick={onConvert}
      >
        <Wand2 className="size-3" aria-hidden="true" />
        Convert
      </Button>
    </div>
  );
}

/** "before → after" for one rule, from the live preview. */
export function StepResult({ step }: { step?: PipelineStep }) {
  if (!step || !step.enabled) return null;
  return (
    <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 px-8 pb-2.5 text-[11px]">
      {step.notReached ? (
        <span className="italic">Not reached: an earlier rule stopped the value.</span>
      ) : step.skip ? (
        <>
          <ShownValue value={step.input} />
          <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
          <span className="text-destructive flex items-center gap-1 font-medium">
            <CircleSlash className="size-3" aria-hidden="true" />
            {step.skip.skip === 'record'
              ? 'Record not synced'
              : 'Field not sent'}
          </span>
          <span>· {step.skip.reason}</span>
        </>
      ) : step.input === step.output ? (
        <>
          <ShownValue value={step.input} />
          <span>· no change for this value</span>
        </>
      ) : (
        <>
          <ShownValue value={step.input} />
          <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
          <ShownValue value={step.output} />
        </>
      )}
    </div>
  );
}
