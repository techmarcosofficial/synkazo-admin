import {
  AlertCircle,
  ArrowRight,
  Check,
  KeyRound,
  ListX,
  Sparkles,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  FieldDef,
  MappingRow,
  MappingUpdatePolicy,
  OnEmptyPolicy,
} from './FieldMappingCanvas';
import DataCleaningTab, {
  defaultCleaningSection,
  type CleaningSection,
} from './field-settings/DataCleaningTab';
import EmptyValueTab from './field-settings/EmptyValueTab';
import RecordMatchingTab from './field-settings/RecordMatchingTab';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Rule } from '@/lib/ruleEngine';
import { validateRules } from '@/lib/ruleValidation';
import { cn } from '@/lib/utils';
import type { ExcludeCondition } from '@/types/conditions';

export type FieldSettingsDrawerSize =
  'compact' | 'default' | 'wide' | 'xl' | 'half';

const DRAWER_SIZE_CLASSES: Record<FieldSettingsDrawerSize, string> = {
  compact: 'data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]',
  default: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl',
  wide: 'data-[side=right]:w-full data-[side=right]:sm:max-w-3xl',
  xl: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl',
  // Half the window, but never so narrow the side tabs and rules crowd.
  half: 'data-[side=right]:w-full data-[side=right]:sm:max-w-[max(50vw,760px)]',
};

export type TargetDrawerSection =
  'all' | 'identity' | 'transforms' | 'fallbacks' | 'skips';

type SettingsTab = 'matching' | 'cleaning' | 'empty';

const TAB_FOR_SECTION: Record<TargetDrawerSection, SettingsTab> = {
  all: 'matching',
  identity: 'matching',
  transforms: 'cleaning',
  skips: 'cleaning',
  fallbacks: 'empty',
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
  projectId?: string;
  sourceObject?: string;
  targetSection?: TargetDrawerSection;
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
}

const UPGRADE_MESSAGE = 'Upgrade your plan to use transformation rules.';

/**
 * Settings for one mapped field, in three tabs: how records are matched,
 * how the value is cleaned, and what happens when it's empty.
 */
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
  targetSection = 'all',
  projectId,
  sourceObject,
  size = 'half',
  className,
  onSave,
}: FieldSettingsDrawerProps) {
  const sourceKey = mapping?.sourceField ?? '';

  const [activeTab, setActiveTab] = useState<SettingsTab>('matching');
  const [isMatch, setIsMatch] = useState(false);
  const [updatePolicy, setUpdatePolicy] =
    useState<MappingUpdatePolicy>('always');
  const [onEmpty, setOnEmpty] = useState<OnEmptyPolicy>('none');
  const [defaultValue, setDefaultValue] = useState('');
  const [reverseOnEmpty, setReverseOnEmpty] = useState<OnEmptyPolicy>('none');
  const [reverseDefaultValue, setReverseDefaultValue] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [cleaningSection, setCleaningSection] =
    useState<CleaningSection>('applied');

  const validationErrors = useMemo(
    () => (saveAttempted ? validateRules(rules) : {}),
    [rules, saveAttempted],
  );
  const invalidRuleCount = Object.keys(validationErrors).length;

  // Load the field's saved settings each time the drawer opens for it.
  useEffect(() => {
    if (!open || !mapping || !destKey) return;
    setIsMatch(mapping.matchDestKey === destKey);
    setUpdatePolicy(mapping.destUpdatePolicy?.[destKey] ?? 'always');
    setOnEmpty(mapping.destOnEmpty?.[destKey] ?? 'none');
    setDefaultValue(mapping.destDefaults?.[destKey] ?? '');
    setReverseOnEmpty(mapping.destReverseOnEmpty?.[destKey] ?? 'none');
    setReverseDefaultValue(mapping.destReverseDefaults?.[destKey] ?? '');
    const savedRules = (mapping.destRules?.[destKey] ?? []) as Rule[];
    setRules(savedRules);
    setCleaningSection(defaultCleaningSection(savedRules, destFieldDef));
    setSaveAttempted(false);
    setActiveTab(TAB_FOR_SECTION[targetSection] ?? 'matching');
    // Opened for this field only: later edits to its definition don't reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapping, destKey, targetSection]);

  if (!mapping || !destKey) return null;

  const handleSave = () => {
    setSaveAttempted(true);
    if (Object.keys(validateRules(rules)).length > 0) {
      setActiveTab('cleaning');
      setCleaningSection('applied');
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(
            '[data-field-settings-tab="cleaning"] [aria-invalid="true"]',
          )
          ?.focus();
      });
      return;
    }
    onSave({
      sourceKey,
      destKey,
      rules,
      onEmpty,
      defaultValue: onEmpty === 'default' ? defaultValue : '',
      reverseOnEmpty: isTwoWay ? reverseOnEmpty : undefined,
      reverseDefaultValue:
        isTwoWay && reverseOnEmpty === 'default'
          ? reverseDefaultValue
          : undefined,
      updatePolicy,
      isMatch,
      excludeCondition: excludeCondition ?? null,
    });
    onOpenChange(false);
  };

  const sourceName = sourceFieldDef?.label || sourceKey;
  const destName = destFieldDef?.label || destKey;
  const emptyIsSet =
    onEmpty !== 'none' || (isTwoWay && reverseOnEmpty !== 'none');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          DRAWER_SIZE_CLASSES[size],
          className,
        )}
        showCloseButton
      >
        <SheetHeader className="bg-background shrink-0 gap-1.5 px-6 pt-5 pb-0">
          <SheetTitle className="text-foreground flex min-w-0 items-center gap-2 pr-8 text-base font-semibold">
            <span className="truncate" title={sourceName}>
              {sourceName}
            </span>
            <ArrowRight
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate" title={destName}>
              {destName}
            </span>
          </SheetTitle>
          {(isMatch || destFieldDef?.required) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {isMatch && (
                <Badge
                  size="xs"
                  className="bg-primary/15 text-primary gap-1 border-0 font-medium"
                >
                  <KeyRound className="size-3" aria-hidden="true" />
                  Identifier
                </Badge>
              )}
              {destFieldDef?.required && (
                <Badge
                  size="xs"
                  tone="danger"
                  className="bg-destructive/15 text-destructive border-0 font-medium"
                >
                  Required
                </Badge>
              )}
            </div>
          )}
          <SheetDescription className="sr-only">
            Set how this field matches records, how its value is cleaned, and
            what happens when it's empty.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="overflow-x-auto border-b px-6 pt-3">
            <TabsList variant="line" className="h-10 min-w-max p-0">
              <TabsTrigger value="matching" className="py-2 text-[13px]">
                <Target aria-hidden="true" />
                Record Matching
              </TabsTrigger>
              <TabsTrigger value="cleaning" className="py-2 text-[13px]">
                <Sparkles aria-hidden="true" />
                Data Cleaning & Transformation
                {rules.length > 0 && (
                  <span className="bg-warning/15 text-warning rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
                    {rules.length}
                    <span className="sr-only">
                      {rules.length === 1 ? ' rule' : ' rules'}
                    </span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="empty" className="py-2 text-[13px]">
                <ListX aria-hidden="true" />
                Empty Value Policy
                {emptyIsSet && (
                  <span
                    className="bg-success size-1.5 rounded-full"
                    aria-label="Configured"
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="bg-muted/20 min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div>
              <TabsContent value="matching" data-field-settings-tab="matching">
                <RecordMatchingTab
                  isMatch={isMatch}
                  onMatchChange={setIsMatch}
                  updatePolicy={updatePolicy}
                  onUpdatePolicyChange={setUpdatePolicy}
                />
              </TabsContent>
              <TabsContent value="cleaning" data-field-settings-tab="cleaning">
                <DataCleaningTab
                  rules={rules}
                  onRulesChange={setRules}
                  sourceFieldDef={sourceFieldDef}
                  destFieldDef={destFieldDef}
                  validationErrors={validationErrors}
                  canUseTransforms={canUseTransforms}
                  onUpgradeRequired={() => promptUpgrade?.(UPGRADE_MESSAGE)}
                  section={cleaningSection}
                  onSectionChange={setCleaningSection}
                  projectId={projectId}
                  sourceObject={sourceObject}
                />
              </TabsContent>
              <TabsContent value="empty" data-field-settings-tab="empty">
                <EmptyValueTab
                  destFieldDef={destFieldDef}
                  sourceFieldDef={sourceFieldDef}
                  isTwoWay={isTwoWay}
                  onEmpty={onEmpty}
                  onOnEmptyChange={setOnEmpty}
                  defaultValue={defaultValue}
                  onDefaultValueChange={setDefaultValue}
                  reverseOnEmpty={reverseOnEmpty}
                  onReverseOnEmptyChange={setReverseOnEmpty}
                  reverseDefaultValue={reverseDefaultValue}
                  onReverseDefaultValueChange={setReverseDefaultValue}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <SheetFooter className="bg-muted/20 shrink-0 flex-col gap-2 border-t px-6 py-3.5">
          {invalidRuleCount > 0 && (
            <p
              role="alert"
              className="text-destructive flex items-center gap-2 text-xs"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              Fill the highlighted fields in {invalidRuleCount}{' '}
              {invalidRuleCount === 1 ? 'rule' : 'rules'} before saving.
            </p>
          )}
          <div className="flex w-full items-center justify-between">
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
              onClick={handleSave}
              className="border-transparent bg-(--brand-orange) text-white hover:bg-(--brand-orange)/90"
            >
              <Check aria-hidden="true" /> Save settings
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
