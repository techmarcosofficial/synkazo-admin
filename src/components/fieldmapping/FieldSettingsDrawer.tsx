import {
  ArrowRight,
  Check,
  Filter,
  KeyRound,
  Plus,
  Settings2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  FieldDef,
  MappingDirection,
  MappingRow,
  MappingUpdatePolicy,
  OnEmptyPolicy,
} from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import type { Rule } from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import type { ConditionOperator, ExcludeCondition } from '@/types/conditions';

export type FieldSettingsDrawerSize = 'compact' | 'default' | 'wide';

const DRAWER_SIZE_CLASSES: Record<FieldSettingsDrawerSize, string> = {
  compact: 'data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]', // ~480px
  default: 'data-[side=right]:w-full data-[side=right]:sm:max-w-xl', // 576px (max-w-xl)
  wide: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl', // 672px (max-w-2xl)
};

export interface FieldSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: MappingRow | null;
  destKey: string | null;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  isTwoWay?: boolean;
  canUseTransforms?: boolean;
  promptUpgrade?: (message: string) => void;
  excludeCondition?: ExcludeCondition;
  size?: FieldSettingsDrawerSize;
  className?: string;
  onSave: (payload: {
    sourceKey: string;
    destKey: string;
    rules: Rule[];
    onEmpty: OnEmptyPolicy;
    defaultValue: string;
    reverseOnEmpty?: OnEmptyPolicy;
    reverseDefaultValue?: string;
    updatePolicy: MappingUpdatePolicy;
    isMatch: boolean;
    excludeCondition?: ExcludeCondition | null;
  }) => void;
  onOpenAdvancedRules?: (sourceKey: string, destKey: string) => void;
}

const SKIP_OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'is_empty', label: 'Is empty / blank' },
  { value: 'is_not_empty', label: 'Is not empty' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
];

export default function FieldSettingsDrawer({
  open,
  onOpenChange,
  mapping,
  destKey,
  sourceFieldDef,
  destFieldDef,
  isTwoWay = false,
  canUseTransforms = true,
  promptUpgrade,
  excludeCondition,
  size = 'default',
  className,
  onSave,
  onOpenAdvancedRules,
}: FieldSettingsDrawerProps) {
  const sourceKey = mapping?.sourceField ?? '';
  const currentDestKey = destKey ?? '';

  // Form State
  const [isMatch, setIsMatch] = useState(false);
  const [updatePolicy, setUpdatePolicy] =
    useState<MappingUpdatePolicy>('always');
  const [onEmpty, setOnEmpty] = useState<OnEmptyPolicy>('none');
  const [defaultValue, setDefaultValue] = useState('');
  const [reverseOnEmpty, setReverseOnEmpty] = useState<OnEmptyPolicy>('none');
  const [reverseDefaultValue, setReverseDefaultValue] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);

  // Skip condition state
  const [hasSkipRule, setHasSkipRule] = useState(false);
  const [skipOperator, setSkipOperator] = useState<ConditionOperator>('equals');
  const [skipValue, setSkipValue] = useState('');

  // Sync state whenever drawer opens for a field
  useEffect(() => {
    if (!open || !mapping || !destKey) return;

    setIsMatch(mapping.matchDestKey === destKey);
    setUpdatePolicy(mapping.destUpdatePolicy?.[destKey] ?? 'always');
    setOnEmpty(mapping.destOnEmpty?.[destKey] ?? 'none');
    setDefaultValue(mapping.destDefaults?.[destKey] ?? '');
    setReverseOnEmpty(mapping.destReverseOnEmpty?.[destKey] ?? 'none');
    setReverseDefaultValue(mapping.destReverseDefaults?.[destKey] ?? '');

    const currentRules = (mapping.destRules?.[destKey] ?? []) as Rule[];
    setRules(currentRules);

    if (excludeCondition) {
      setHasSkipRule(true);
      setSkipOperator(excludeCondition.operator);
      setSkipValue(
        typeof excludeCondition.value === 'string'
          ? excludeCondition.value
          : excludeCondition.value != null
            ? String(excludeCondition.value)
            : '',
      );
    } else {
      setHasSkipRule(false);
      setSkipOperator('equals');
      setSkipValue('');
    }
  }, [open, mapping, destKey, excludeCondition]);

  if (!mapping || !destKey) return null;

  // Formatting Rule toggles
  const isTrim = rules.some((r) => r.type === 'trim');
  const isCapitalize = rules.some((r) => r.type === 'capitalize');
  const isUppercase = rules.some((r) => r.type === 'uppercase');
  const isLowercase = rules.some((r) => r.type === 'lowercase');
  const isPhone = rules.some((r) => r.type === 'phone_format');

  const toggleRule = (
    type: string,
    exclusiveGroup?: string[],
    ruleParams?: Partial<Rule>,
  ) => {
    if (!canUseTransforms && promptUpgrade) {
      promptUpgrade('Upgrade your plan to use data transformation rules.');
      return;
    }

    setRules((prev) => {
      const exists = prev.some((r) => r.type === type);
      if (exists) {
        return prev.filter((r) => r.type !== type);
      }
      let cleaned = prev;
      if (exclusiveGroup && exclusiveGroup.length > 0) {
        cleaned = prev.filter((r) => !exclusiveGroup.includes(r.type));
      }
      return [...cleaned, { type, ...ruleParams }];
    });
  };

  const otherRules = rules.filter(
    (r) =>
      !['trim', 'capitalize', 'uppercase', 'lowercase', 'phone_format'].includes(
        r.type,
      ),
  );

  const removeCustomRule = (indexInOther: number) => {
    const target = otherRules[indexInOther];
    if (!target) return;
    setRules((prev) => prev.filter((r) => r !== target));
  };

  const handleSave = () => {
    let finalCondition: ExcludeCondition | null = null;
    if (hasSkipRule && sourceKey) {
      finalCondition = {
        field: sourceKey,
        operator: skipOperator,
        value: ['is_empty', 'is_not_empty'].includes(skipOperator)
          ? undefined
          : skipValue,
      };
    }

    onSave({
      sourceKey,
      destKey,
      rules,
      onEmpty,
      defaultValue: onEmpty === 'default' ? defaultValue : '',
      reverseOnEmpty: isTwoWay ? reverseOnEmpty : undefined,
      reverseDefaultValue:
        isTwoWay && reverseOnEmpty === 'default' ? reverseDefaultValue : undefined,
      updatePolicy,
      isMatch,
      excludeCondition: finalCondition,
    });
    onOpenChange(false);
  };

  const sourceName = sourceFieldDef?.label || sourceKey;
  const destName = destFieldDef?.label || destKey;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col gap-0 p-0',
          DRAWER_SIZE_CLASSES[size],
          className,
        )}
        showCloseButton
      >
        {/* Fixed Header */}
        <SheetHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-muted-foreground text-[11px] font-medium"
            >
              Field Settings
            </Badge>
            {isMatch && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-[11px]"
              >
                <KeyRound className="mr-1 size-3" /> Unique Identifier
              </Badge>
            )}
            {destFieldDef?.required && (
              <Badge
                variant="secondary"
                className="bg-destructive/10 text-destructive border-destructive/20 text-[11px]"
              >
                Required
              </Badge>
            )}
          </div>
          <SheetTitle className="text-foreground mt-1 flex items-center gap-2 text-base font-semibold">
            <span className="truncate max-w-[260px]" title={sourceName}>
              {sourceName}
            </span>
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate max-w-[260px]" title={destName}>
              {destName}
            </span>
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            Manage data fallback, transformation rules, record identification,
            and skip filters for this mapped field.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {/* Section 1: Identification & Update Policy */}
          <div className="space-y-3">
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Identity & Overwrite Policy
            </h4>

            <div className="bg-muted/30 space-y-3 rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="match-toggle"
                    className="text-foreground text-sm font-medium"
                  >
                    Match Identifier
                  </Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Use this field (e.g. Email or ID) to look up existing
                    records and update them instead of creating duplicates.
                  </p>
                </div>
                <Switch
                  id="match-toggle"
                  checked={isMatch}
                  onCheckedChange={setIsMatch}
                />
              </div>

              <div className="border-t pt-3">
                <Label className="text-foreground mb-1.5 block text-xs font-medium">
                  When updating existing records:
                </Label>
                <RadioGroup
                  value={updatePolicy}
                  onValueChange={(val) =>
                    setUpdatePolicy(val as MappingUpdatePolicy)
                  }
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
                      updatePolicy === 'always'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <RadioGroupItem value="always" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-foreground block font-medium">
                        Always overwrite
                      </span>
                      <span className="text-muted-foreground text-[11px] leading-tight">
                        Update this field every sync run.
                      </span>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
                      updatePolicy === 'create_only'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <RadioGroupItem value="create_only" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-foreground block font-medium">
                        Create only
                      </span>
                      <span className="text-muted-foreground text-[11px] leading-tight">
                        Set once on create. Never overwrite later edits.
                      </span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Section 2: Fallback when Source is Empty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
                Fallback When Value is Empty
              </h4>
              {destFieldDef?.required && (
                <span className="text-destructive text-[11px] font-medium">
                  Destination requires a value
                </span>
              )}
            </div>

            <div className="bg-muted/30 space-y-3 rounded-2xl border p-4">
              <RadioGroup
                value={onEmpty}
                onValueChange={(val) => setOnEmpty(val as OnEmptyPolicy)}
                className="grid gap-2"
              >
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
                    onEmpty === 'none'
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 hover:bg-muted/40',
                  )}
                >
                  <RadioGroupItem value="none" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-foreground block font-medium">
                      Leave empty / blank
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Pass empty value directly to the destination.
                    </span>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
                    onEmpty === 'default'
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 hover:bg-muted/40',
                  )}
                >
                  <RadioGroupItem value="default" className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-foreground block font-medium">
                      Use a default fallback value
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Write this fallback value whenever the source field is
                      blank.
                    </span>
                  </div>
                </label>

                {onEmpty === 'default' && (
                  <div className="bg-background rounded-xl border p-3 pl-8">
                    <Label className="text-foreground mb-1.5 block text-xs font-medium">
                      Default Value:
                    </Label>
                    {destFieldDef?.options && destFieldDef.options.length > 0 ? (
                      <Select
                        value={defaultValue}
                        onValueChange={setDefaultValue}
                      >
                        <SelectTrigger className="h-9 w-full text-xs">
                          <SelectValue placeholder="Select fallback option…" />
                        </SelectTrigger>
                        <SelectContent>
                          {destFieldDef.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label || opt.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={defaultValue}
                        onChange={(e) => setDefaultValue(e.target.value)}
                        placeholder="e.g. N/A or Default..."
                        className="h-9 text-xs"
                      />
                    )}
                  </div>
                )}

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
                    onEmpty === 'skip_record'
                      ? 'border-destructive/60 bg-destructive/5'
                      : 'border-border/60 hover:bg-muted/40',
                  )}
                >
                  <RadioGroupItem value="skip_record" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-foreground block font-medium">
                      Skip record if empty
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Do not create or update this record at all if this field is
                      missing.
                    </span>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>

          {/* Section 3: Clean & Format Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
                Clean & Format Rules
              </h4>
              {rules.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/20 text-[11px]"
                >
                  {rules.length} rule{rules.length !== 1 ? 's' : ''} applied
                </Badge>
              )}
            </div>

            <div className="bg-muted/30 space-y-3 rounded-2xl border p-4">
              <p className="text-muted-foreground text-xs">
                Quickly transform and clean values before writing to the
                destination:
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors">
                  <Checkbox
                    checked={isTrim}
                    onCheckedChange={() => toggleRule('trim')}
                  />
                  <div>
                    <span className="text-foreground font-medium">
                      Trim extra spaces
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      Remove leading/trailing spaces
                    </span>
                  </div>
                </label>

                <label className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors">
                  <Checkbox
                    checked={isCapitalize}
                    onCheckedChange={() =>
                      toggleRule('capitalize', ['uppercase', 'lowercase'])
                    }
                  />
                  <div>
                    <span className="text-foreground font-medium">
                      Title Case
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      Capitalize Each Word
                    </span>
                  </div>
                </label>

                <label className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors">
                  <Checkbox
                    checked={isUppercase}
                    onCheckedChange={() =>
                      toggleRule('uppercase', ['capitalize', 'lowercase'])
                    }
                  />
                  <div>
                    <span className="text-foreground font-medium">
                      UPPERCASE
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      Convert all characters to caps
                    </span>
                  </div>
                </label>

                <label className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors">
                  <Checkbox
                    checked={isLowercase}
                    onCheckedChange={() =>
                      toggleRule('lowercase', ['capitalize', 'uppercase'])
                    }
                  />
                  <div>
                    <span className="text-foreground font-medium">lowercase</span>
                    <span className="text-muted-foreground block text-[10px]">
                      Convert all characters to lower
                    </span>
                  </div>
                </label>

                <label className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors">
                  <Checkbox
                    checked={isPhone}
                    onCheckedChange={() => toggleRule('phone_format')}
                  />
                  <div>
                    <span className="text-foreground font-medium">
                      Phone Number
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      Format as standard phone
                    </span>
                  </div>
                </label>
              </div>

              {/* Other Custom Rules */}
              {otherRules.length > 0 && (
                <div className="border-t pt-3">
                  <Label className="text-foreground mb-2 block text-xs font-medium">
                    Additional Custom Rules:
                  </Label>
                  <div className="space-y-1.5">
                    {otherRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="bg-background flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="text-warning size-3.5" />
                          <span className="font-mono font-medium">
                            {rule.type}
                          </span>
                          {rule.find && (
                            <span className="text-muted-foreground text-[11px]">
                              ("{rule.find}" ➔ "{rule.replacement ?? ''}")
                            </span>
                          )}
                          {rule.value && (
                            <span className="text-muted-foreground text-[11px]">
                              (value: "{rule.value}")
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomRule(idx)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onOpenAdvancedRules && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onOpenAdvancedRules(sourceKey, destKey)}
                >
                  <Settings2 className="mr-1.5 size-3.5" />
                  Advanced Rule Builder (Regex, Replace, Value Maps)
                </Button>
              )}
            </div>
          </div>

          {/* Section 4: Field Skip Condition */}
          <div className="space-y-3">
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Field Skip Filter
            </h4>

            <div className="bg-muted/30 space-y-3 rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="skip-rule-toggle"
                    className="text-foreground text-sm font-medium"
                  >
                    Skip Record by Field Value
                  </Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Filter out records based on this source field's value before
                    syncing.
                  </p>
                </div>
                <Switch
                  id="skip-rule-toggle"
                  checked={hasSkipRule}
                  onCheckedChange={setHasSkipRule}
                />
              </div>

              {hasSkipRule && (
                <div className="bg-background space-y-3 rounded-xl border p-3">
                  <div className="text-muted-foreground text-xs">
                    Skip this record when{' '}
                    <strong className="text-foreground">{sourceName}</strong>:
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground mb-1 block text-[11px]">
                        Condition:
                      </Label>
                      <Select
                        value={skipOperator}
                        onValueChange={(val) =>
                          setSkipOperator(val as ConditionOperator)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKIP_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!['is_empty', 'is_not_empty'].includes(skipOperator) && (
                      <div>
                        <Label className="text-muted-foreground mb-1 block text-[11px]">
                          Target Value:
                        </Label>
                        <Input
                          value={skipValue}
                          onChange={(e) => setSkipValue(e.target.value)}
                          placeholder="e.g. Inactive or test..."
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <SheetFooter className="bg-muted/20 shrink-0 border-t px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              <Check className="mr-1.5 size-4" /> Save settings
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
