import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  GitBranch,
  GripVertical,
  Hash,
  Info,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';

import { associationsApi } from '@/api/associations';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  executeRulePipeline,
  RULE_CATEGORIES,
  RULE_DEFINITIONS,
  type Rule,
  type RuleDefinition,
} from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import type { FieldMapping } from '@/types';

const REQUIRED_PARAMS: Record<string, string[]> = {
  replace: ['find'],
  remove_text: ['find'],
  prefix: ['value'],
  suffix: ['value'],
  regex_replace: ['pattern'],
  char_limit: ['value'],
  word_limit: ['value'],
  min_length: ['value'],
  max_length: ['value'],
  default_if_empty: ['value'],
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

const NUMERIC_VALUE_RULES = new Set([
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

const DEFAULT_TEST_BY_TYPE: Record<string, string> = {
  string: 'Etc etc',
  number: '42.5',
  boolean: 'true',
  date: '2024-01-15',
  datetime: '2024-01-15T09:30:00Z',
  enum: 'active',
  array: 'item1, item2, item3',
};

const PARAM_LABELS: Record<string, string> = {
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

const CATEGORY_ICONS: Record<
  string,
  ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  text: TypeIcon,
  length: Ruler,
  validation: ShieldCheck,
  conditional: GitBranch,
  number: Hash,
  date: Calendar,
  split: Scissors,
  conversion: RefreshCw,
};

function isParamNumeric(ruleType: string, paramKey: string): boolean {
  if (paramKey === 'decimals' || paramKey === 'days' || paramKey === 'index')
    return true;
  if (paramKey === 'value' && NUMERIC_VALUE_RULES.has(ruleType)) return true;
  return false;
}

/**
 * Editor for the Map Values rule's lookup table. Free-text on the left because
 * source values are whatever the source platform happens to emit; a picker on the
 * right whenever the destination field publishes its allowed options, since
 * anything outside that list is dropped silently at write time.
 */
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
    <div className="flex flex-col gap-2 px-14 pt-1 pb-3">
      {entries.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No values mapped yet — add one for each source value this field can
          hold.
        </p>
      )}
      {entries.map(([from, to], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={from}
            onChange={(e) => renameKey(i, e.target.value)}
            placeholder="Source value"
            className="bg-muted h-9 flex-1 rounded-3xl border-transparent font-mono text-xs shadow-none"
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger
                size="sm"
                className="bg-muted h-9 flex-1 rounded-3xl border-transparent shadow-none"
              >
                <SelectValue placeholder="Destination value" />
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
              className="bg-muted h-9 flex-1 rounded-3xl border-transparent font-mono text-xs shadow-none"
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove value mapping"
            className="text-muted-foreground hover:text-destructive"
            onClick={() =>
              writeEntries(
                entries.filter((_, j) => j !== i) as [string, string][],
              )
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus /> Add value
      </Button>
    </div>
  );
}

/**
 * Editor for the Map Values (Normalized) rule: the same source/destination
 * pair list as ValueMapEditor, plus normalization toggles applied to both
 * the input and the map's own keys before lookup, and a default value used
 * when nothing matches (including null/empty/whitespace-only input).
 */
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
    <div className="flex flex-col gap-2 px-14 pt-1 pb-3">
      <div className="flex flex-wrap items-center gap-4 pb-1">
        <label className="flex items-center gap-1.5">
          <Switch
            checked={!!norm.trim}
            onCheckedChange={(v) => setNorm({ trim: v })}
          />
          <span className="text-muted-foreground text-xs">Trim whitespace</span>
        </label>
        <label className="flex items-center gap-1.5">
          <Switch
            checked={!!norm.lowercase}
            onCheckedChange={(v) => setNorm({ lowercase: v })}
          />
          <span className="text-muted-foreground text-xs">Lowercase</span>
        </label>
        <label className="flex items-center gap-1.5">
          <Switch
            checked={!!norm.replaceUnderscoreAndHyphenWithSpace}
            onCheckedChange={(v) =>
              setNorm({ replaceUnderscoreAndHyphenWithSpace: v })
            }
          />
          <span className="text-muted-foreground text-xs">
            Treat _ / - as space
          </span>
        </label>
      </div>
      {entries.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No values mapped yet — add one for each source value this field can
          hold.
        </p>
      )}
      {entries.map(([from, to], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={from}
            onChange={(e) => renameKey(i, e.target.value)}
            placeholder="Source value"
            className="bg-muted h-9 flex-1 rounded-3xl border-transparent font-mono text-xs shadow-none"
          />
          <ArrowRight className="text-muted-foreground size-3 shrink-0" />
          {destOptions?.length ? (
            <Select value={to} onValueChange={(v) => setValue(i, v)}>
              <SelectTrigger
                size="sm"
                className="bg-muted h-9 flex-1 rounded-3xl border-transparent shadow-none"
              >
                <SelectValue placeholder="Destination value" />
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
              className="bg-muted h-9 flex-1 rounded-3xl border-transparent font-mono text-xs shadow-none"
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove value mapping"
            className="text-muted-foreground hover:text-destructive"
            onClick={() =>
              writeEntries(
                entries.filter((_, j) => j !== i) as [string, string][],
              )
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() =>
          writeEntries([...entries, ['', '']] as [string, string][])
        }
      >
        <Plus /> Add value
      </Button>
    </div>
  );
}

function ActiveRule({
  rule,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  validationErrors,
  destOptions,
}: {
  rule: Rule;
  index: number;
  total: number;
  onUpdate: (index: number, rule: Rule) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  validationErrors: Record<number, string[]>;
  destOptions?: { value: string; label: string }[];
}) {
  const def: RuleDefinition | undefined = RULE_DEFINITIONS.find(
    (r) => r.type === rule.type,
  );
  const inlineParams = (def?.params ?? []).filter((p) => p !== 'map');
  const isValueMap = rule.type === 'value_map';
  const isValueMapping = rule.type === 'value_mapping';
  const hasParams = inlineParams.length > 0 || isValueMap || isValueMapping;
  const isEnabled = rule.enabled !== false;
  const ruleErrors = validationErrors[index] || [];
  const hasError = ruleErrors.length > 0;

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
        'border-border bg-card rounded-4xl border shadow-none transition-opacity',
        hasError && 'border-destructive',
        !isEnabled && 'opacity-55',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-muted-foreground/50 bg-muted/40 flex size-8 shrink-0 items-center justify-center rounded-3xl">
          <GripVertical className="size-4" />
        </span>

        <span
          className={cn(
            'bg-muted text-foreground flex size-7 shrink-0 items-center justify-center rounded-3xl text-xs font-bold',
            hasError && 'bg-destructive text-destructive-foreground',
          )}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-semibold',
              !isEnabled && 'text-muted-foreground',
            )}
          >
            {def?.label || rule.type}
          </p>
          {def?.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {def.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {hasError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="text-destructive mr-1 size-4" />
              </TooltipTrigger>
              <TooltipContent side="top">
                {ruleErrors
                  .map((p) => `"${PARAM_LABELS[p] || p}" is required`)
                  .join(', ')}
              </TooltipContent>
            </Tooltip>
          )}

          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) =>
              onUpdate(index, { ...rule, enabled: checked })
            }
            aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${def?.label || rule.type}`}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => index > 0 && onMove(index, index - 1)}
            disabled={index === 0}
            aria-label="Move rule up"
          >
            <ChevronUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => index < total - 1 && onMove(index, index + 1)}
            disabled={index === total - 1}
            aria-label="Move rule down"
          >
            <ChevronDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${def?.label || rule.type} rule`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {hasParams && isEnabled && (
        <div className="grid gap-3 px-14 pb-3 sm:grid-cols-2">
          {(isValueMap ? ['fallback'] : inlineParams).map((p) => {
            const isRequired = (REQUIRED_PARAMS[rule.type] || []).includes(p);
            const isNum = isParamNumeric(rule.type, p);
            const val = rule[p];
            const isEmpty = !val || String(val).trim() === '';
            const showError = isRequired && isEmpty && ruleErrors.includes(p);
            return (
              <label key={p} className="min-w-0 space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                  {PARAM_LABELS[p] || p}
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
                  onClick={(e) => e.stopPropagation()}
                  aria-invalid={showError}
                  className="bg-muted h-9 w-full rounded-3xl border-transparent font-mono text-xs shadow-none"
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

      {hasError && (
        <div className="flex flex-wrap gap-2 px-14 pb-2.5">
          {ruleErrors.map((p) => (
            <span key={p} className="text-destructive text-xs">
              {p === 'map'
                ? 'Add at least one value mapping'
                : `"${PARAM_LABELS[p] || p}" is required`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SourceField {
  key: string;
  label?: string;
  type?: string;
}

interface DestField {
  key: string;
  label?: string;
  type?: string;
  options?: { value: string; label: string }[];
}

interface RuleBuilderModalProps {
  mapping: FieldMapping;
  destKey: string;
  initialRules?: Rule[];
  sourceFields: SourceField[];
  destFields: DestField[];
  onSave: (rules: Rule[]) => void;
  onClose: () => void;
  projectId?: string;
  sourceObject?: string;
}

export interface RulePreviewStep {
  index: number;
  label: string;
  output: string;
  enabled: boolean;
}

export function buildRulePreviewSteps(
  input: string,
  rules: Rule[],
): RulePreviewStep[] {
  let current = input;
  let failed = false;

  return rules.map((rule, index) => {
    const enabled = rule.enabled !== false;
    if (enabled && !failed) {
      try {
        current = String(executeRulePipeline(current, [rule]));
      } catch {
        current = '(error)';
        failed = true;
      }
    }
    return {
      index,
      label:
        RULE_DEFINITIONS.find((definition) => definition.type === rule.type)
          ?.label || rule.type,
      output: current,
      enabled,
    };
  });
}

export default function RuleBuilderModal({
  mapping,
  destKey,
  initialRules,
  sourceFields,
  destFields,
  onSave,
  onClose,
  projectId,
  sourceObject,
}: RuleBuilderModalProps) {
  const sourceField = sourceFields.find((f) => f.key === mapping.sourceField);
  const sourceType = sourceField?.type || 'string';
  const destField = destFields.find((f) => f.key === destKey);
  const destType = destField?.type;

  const [rules, setRules] = useState<Rule[]>(initialRules || []);
  const initialRulesSnapshotRef = useRef(JSON.stringify(initialRules || []));
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('text');
  const [testInput, setTestInput] = useState(
    DEFAULT_TEST_BY_TYPE[sourceType] || '',
  );
  const [dupFlash, setDupFlash] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string[]>
  >({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!projectId || !sourceObject) return;
    associationsApi
      .getSampleRecord(projectId, sourceObject)
      .then((record) => {
        if (!record) return;
        const fieldValue = record[mapping.sourceField];
        if (
          fieldValue !== undefined &&
          fieldValue !== null &&
          String(fieldValue).trim() !== ''
        ) {
          setTestInput(String(fieldValue));
        }
      })
      .catch(() => {});
  }, [projectId, sourceObject, mapping.sourceField]);

  const addRule = (def: RuleDefinition) => {
    if (rules.some((r) => r.type === def.type)) {
      setDupFlash(def.type);
      setTimeout(() => setDupFlash(null), 1500);
      return;
    }
    const newRule: Rule = { type: def.type, enabled: true };
    if (def.params)
      def.params.forEach((p) => {
        newRule[p] = '';
      });
    setRules((prev) => [...prev, newRule]);
    if (saveAttempted) setValidationErrors({});
  };

  const updateRule = (index: number, updated: Rule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? updated : r)));
    if (saveAttempted) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        const errs = validateRule(updated);
        if (errs.length === 0) delete next[index];
        else next[index] = errs;
        return next;
      });
    }
  };
  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setValidationErrors((prev) => {
      const next: Record<number, string[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  };
  const moveRule = (from: number, to: number) => {
    const next = [...rules];
    [next[from], next[to]] = [next[to], next[from]];
    setRules(next);
  };

  function validateRule(rule: Rule): string[] {
    const required = REQUIRED_PARAMS[rule.type] || [];
    if (rule.enabled === false) return [];
    return required.filter((p) => {
      // `map` is a lookup table: "provided" means at least one complete pair,
      // not a non-blank string.
      if (p === 'map') {
        const entries = Object.entries(
          (rule.map ?? {}) as Record<string, string>,
        );
        return !entries.some(
          ([from, to]) => from.trim() !== '' && to.trim() !== '',
        );
      }
      return !rule[p] || String(rule[p]).trim() === '';
    });
  }

  function validateAll(): Record<number, string[]> {
    const errs: Record<number, string[]> = {};
    rules.forEach((rule, i) => {
      const missing = validateRule(rule);
      if (missing.length > 0) errs[i] = missing;
    });
    return errs;
  }

  const handleSave = () => {
    setSaveAttempted(true);
    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    onSave(rules);
    onClose();
  };

  const previewOutput = useMemo(() => {
    try {
      return String(executeRulePipeline(testInput, rules));
    } catch {
      return '(error)';
    }
  }, [testInput, rules]);
  const previewSteps = useMemo(
    () => buildRulePreviewSteps(testInput, rules),
    [testInput, rules],
  );

  const destLabel = destField?.label || destKey;

  const searchResults = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return RULE_DEFINITIONS.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [search]);

  const activeRuleCount = rules.filter((r) => r.enabled !== false).length;
  const totalErrors = Object.keys(validationErrors).length;
  const hasUnsavedChanges =
    JSON.stringify(rules) !== initialRulesSnapshotRef.current;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        className="p-0 data-[side=right]:w-[60vw] data-[side=right]:sm:max-w-[96rem]"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <SheetHeader className="shrink-0 gap-4 border-b px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-3xl">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-bold">
                Transformation Rules
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                Build transformation rules for this field mapping.
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="bg-muted/50 border-border rounded-3xl border px-3 py-2 text-xs font-medium">
                  {sourceField?.label || mapping.sourceField}
                  <Badge variant="secondary" className="ml-2 font-mono">
                    {sourceType}
                  </Badge>
                </span>
                <ArrowRight className="text-muted-foreground size-3" />
                <span className="bg-muted/50 border-border rounded-3xl border px-3 py-2 text-xs font-medium">
                  {destLabel}
                  {destType && (
                    <Badge variant="secondary" className="ml-2 font-mono">
                      {destType}
                    </Badge>
                  )}
                </span>
                {activeRuleCount > 0 && (
                  <Badge variant="secondary">
                    {activeRuleCount} active rule
                    {activeRuleCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {totalErrors > 0 && (
                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 gap-1">
                    <AlertCircle className="size-2.5" /> {totalErrors} need
                    values
                  </Badge>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto shrink-0"
              onClick={onClose}
              aria-label="Close transformation rules"
            >
              <X />
            </Button>
          </div>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-4">
          <div className="bg-muted/40 flex items-start gap-3 rounded-4xl px-4 py-3">
            <Info className="text-primary mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">How transformations work</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Rules run from top to bottom. Use the arrows to reorder, or
                disable a rule without deleting it.
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[18rem_minmax(28rem,1fr)_20rem] xl:overflow-hidden">
          {/* Rule library */}
          <aside className="border-border bg-card flex max-h-[38vh] min-h-0 flex-col gap-4 rounded-4xl border p-4 xl:max-h-none">
            <div>
              <h3 className="text-sm font-bold">Rule library</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Choose a rule to add to this field.
              </p>
            </div>
            <InputGroup>
              <InputGroupAddon>
                <Search className="text-muted-foreground size-4" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules…"
                className="rounded-none"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>

            <ScrollArea className="min-h-0 flex-1">
              {!search ? (
                <Accordion
                  type="single"
                  collapsible
                  value={activeCategory ?? ''}
                  onValueChange={(val) => setActiveCategory(val || null)}
                  className="space-y-1"
                >
                  {RULE_CATEGORIES.map((cat) => {
                    const catRules = RULE_DEFINITIONS.filter(
                      (r) => r.category === cat.id,
                    );
                    const isOpen = activeCategory === cat.id;
                    const Icon = CATEGORY_ICONS[cat.id] || TypeIcon;
                    const addedTypes = new Set(rules.map((r) => r.type));

                    return (
                      <AccordionItem
                        key={cat.id}
                        value={cat.id}
                        className={cn(
                          'overflow-hidden rounded-4xl border-0 border-l-2',
                          isOpen
                            ? 'border-primary bg-muted/50'
                            : 'border-transparent',
                        )}
                      >
                        <AccordionTrigger className="px-2.5 py-2.5 text-sm font-semibold hover:no-underline [&>svg]:size-3.5">
                          <span className="flex flex-1 items-center gap-2.5">
                            <Icon
                              className={cn(
                                'size-4 shrink-0',
                                isOpen
                                  ? 'text-primary'
                                  : 'text-muted-foreground',
                              )}
                            />
                            {cat.label}
                            <Badge
                              variant="secondary"
                              className="ml-auto rounded-full px-2 font-normal"
                            >
                              {catRules.length}
                            </Badge>
                          </span>
                        </AccordionTrigger>

                        <AccordionContent className="pb-1">
                          <div className="ml-5 space-y-0.5 border-l pl-3.5">
                            {catRules.map((def) => {
                              const alreadyAdded = addedTypes.has(def.type);
                              const isFlashing = dupFlash === def.type;
                              return (
                                <button
                                  key={def.type}
                                  type="button"
                                  onClick={() => addRule(def)}
                                  className={cn(
                                    'group flex w-full items-start gap-2 rounded-3xl px-2 py-2 text-left text-xs transition-colors',
                                    isFlashing
                                      ? 'bg-destructive/10'
                                      : 'hover:bg-muted/60',
                                  )}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        'block truncate font-medium',
                                        alreadyAdded
                                          ? 'text-muted-foreground'
                                          : 'text-foreground/80 group-hover:text-foreground',
                                      )}
                                    >
                                      {def.label}
                                    </span>
                                    <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-[11px] leading-4">
                                      {def.description}
                                    </span>
                                  </span>
                                  {alreadyAdded ? (
                                    <span className="text-success flex shrink-0 items-center gap-1 text-[11px] font-medium">
                                      Added <Check className="size-3" />
                                    </span>
                                  ) : (
                                    <Plus className="text-muted-foreground group-hover:text-foreground mt-0.5 size-3 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="space-y-0.5">
                  {(searchResults || []).map((def) => {
                    const alreadyAdded = rules.some((r) => r.type === def.type);
                    const isFlashing = dupFlash === def.type;
                    return (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => addRule(def)}
                        className={cn(
                          'group w-full rounded-3xl px-2.5 py-2 text-left transition-colors',
                          isFlashing
                            ? 'bg-destructive/10'
                            : 'hover:bg-muted/60',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              alreadyAdded
                                ? 'text-muted-foreground'
                                : 'text-foreground group-hover:text-primary',
                            )}
                          >
                            {def.label}
                          </span>
                          {alreadyAdded ? (
                            <Check className="text-success size-3" />
                          ) : (
                            <Plus className="text-muted-foreground group-hover:text-primary size-3" />
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {def.description}
                        </div>
                      </button>
                    );
                  })}
                  {(searchResults || []).length === 0 && (
                    <p className="text-muted-foreground px-3 py-6 text-center text-xs">
                      No rules found
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* Rule pipeline */}
          <section className="border-border bg-card flex min-h-96 min-w-0 flex-col rounded-4xl border xl:min-h-0">
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Rule pipeline</h3>
                  <Badge variant="secondary">{rules.length}</Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Applied in this order from top to bottom.
                </p>
              </div>
              {rules.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    confirm({
                      variant: 'danger',
                      title: 'Clear all rules?',
                      description:
                        "This removes every rule from this field's pipeline. This can't be undone.",
                      confirmLabel: 'Clear all',
                      onConfirm: () => {
                        setRules([]);
                        setValidationErrors({});
                        setSaveAttempted(false);
                      },
                    })
                  }
                >
                  <Trash2 /> Clear all
                </Button>
              )}
            </div>

            <ScrollArea className="min-h-0 flex-1 px-6">
              {rules.length === 0 ? (
                <div className="flex flex-col items-center pt-8 text-center">
                  <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-4xl">
                    <Sparkles className="text-muted-foreground size-5" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    No rules added yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Click any rule from the left panel to add it
                  </p>
                </div>
              ) : (
                <div className="pb-4">
                  {rules.map((rule, idx) => (
                    <div key={idx}>
                      <ActiveRule
                        rule={rule}
                        index={idx}
                        total={rules.length}
                        onUpdate={updateRule}
                        onRemove={removeRule}
                        onMove={moveRule}
                        validationErrors={validationErrors}
                        destOptions={destField?.options}
                      />
                      {idx < rules.length - 1 && (
                        <div className="bg-border mx-9 h-2.5 w-px" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </section>

          {/* Transformation preview */}
          <aside className="border-border bg-card min-h-0 overflow-y-auto rounded-4xl border p-4">
            <div>
              <h3 className="text-sm font-bold">Test transformation</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Try a value before applying these rules.
              </p>
            </div>

            <div className="bg-muted/30 mt-4 rounded-4xl border p-3">
              <label
                htmlFor="rule-preview-input"
                className="text-xs font-semibold"
              >
                Source value
              </label>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                Edit this sample to see every step update.
              </p>
              <Input
                id="rule-preview-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="bg-background mt-2 h-9 rounded-3xl font-mono text-xs shadow-none"
                placeholder="Test input…"
              />
            </div>

            <div className="mt-4">
              <div className="bg-muted/30 rounded-4xl border px-3 py-2.5">
                <p className="text-muted-foreground text-[11px] font-medium">
                  Original
                </p>
                <output className="mt-1 block font-mono text-xs break-all">
                  {testInput || (
                    <span className="text-muted-foreground">(empty)</span>
                  )}
                </output>
              </div>

              {previewSteps.map((step) => (
                <div key={`${step.index}-${step.label}`}>
                  <div className="bg-border mx-5 h-2.5 w-px" />
                  <div
                    className={cn(
                      'rounded-4xl border px-3 py-2.5',
                      !step.enabled && 'bg-muted/30 opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-3xl text-[10px] font-bold">
                        {step.index + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                        {step.label}
                      </p>
                      {!step.enabled && (
                        <Badge variant="outline" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <output className="mt-2 block font-mono text-xs break-all">
                      {step.output || (
                        <span className="text-muted-foreground">(empty)</span>
                      )}
                    </output>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-primary/20 bg-primary/5 mt-4 rounded-4xl border p-3">
              <p className="text-primary text-[11px] font-semibold">
                Final output
              </p>
              <output className="mt-1 block font-mono text-sm font-semibold break-all">
                {previewOutput !== '' ? (
                  previewOutput
                ) : (
                  <span className="text-muted-foreground">(empty)</span>
                )}
              </output>
            </div>

            <p className="text-muted-foreground mt-3 flex items-start gap-2 text-[11px]">
              <Info className="mt-0.5 size-3 shrink-0" /> Preview updates as you
              edit or reorder rules.
            </p>
          </aside>
        </div>

        {/* Footer */}
        <SheetFooter className="shrink-0 flex-row items-center justify-between border-t px-6 py-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {hasUnsavedChanges ? (
              <>
                <span className="bg-warning size-2 rounded-full" />
                Unsaved rule changes
              </>
            ) : (
              <>
                <Check className="text-success size-3.5" />
                {activeRuleCount} active rule
                {activeRuleCount !== 1 ? 's' : ''}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className={cn(
                totalErrors > 0 && 'bg-destructive hover:bg-destructive/90',
              )}
            >
              <Check /> Apply rules
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
