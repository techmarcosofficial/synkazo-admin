import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  KeyRound,
  Plus,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  FieldDef,
  MappingRow,
  MappingUpdatePolicy,
  OnEmptyPolicy,
} from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  RULE_DEFINITIONS,
  type Rule,
  type RuleDefinition,
} from '@/lib/ruleEngine';
import { buildRuleSuggestions, type RuleSuggestion } from '@/lib/ruleSuggestions';
import { cn } from '@/lib/utils';
import type { ExcludeCondition } from '@/types/conditions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import DraggableRulePipeline from './DraggableRulePipeline';
import FieldPipelineEffectRail from './FieldPipelineEffectRail';
import QuickPresetBar from './QuickPresetBar';
import RuleLibraryPopover from './RuleLibraryPopover';

export type FieldSettingsDrawerSize = 'compact' | 'default' | 'wide' | 'xl';

const DRAWER_SIZE_CLASSES: Record<FieldSettingsDrawerSize, string> = {
  compact: 'data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]',
  default: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:xl:max-w-4xl',
  wide: 'data-[side=right]:w-full data-[side=right]:sm:max-w-3xl data-[side=right]:xl:max-w-4xl',
  xl: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:xl:max-w-4xl',
};

export type TargetDrawerSection =
  | 'all'
  | 'identity'
  | 'transforms'
  | 'fallbacks'
  | 'skips';

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

function FlatSection({
  title,
  icon: Icon,
  badge,
  theme = 'primary',
  isExpanded,
  onToggle,
  children,
  highlighted,
  sectionRef,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  theme?: 'primary' | 'info' | 'warning' | 'success';
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  highlighted?: boolean;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const themeStyles = {
    primary: {
      icon: 'bg-primary/10 text-primary border-0',
      headerExpanded: 'bg-primary/[0.04] dark:bg-primary/[0.08]',
      highlight: 'bg-primary/[0.03] dark:bg-primary/[0.06]',
    },
    info: {
      icon: 'bg-info/10 text-info border-0',
      headerExpanded: 'bg-info/[0.04] dark:bg-info/[0.08]',
      highlight: 'bg-info/[0.03] dark:bg-info/[0.06]',
    },
    warning: {
      icon: 'bg-warning/10 text-warning border-0',
      headerExpanded: 'bg-warning/[0.04] dark:bg-warning/[0.08]',
      highlight: 'bg-warning/[0.03] dark:bg-warning/[0.06]',
    },
    success: {
      icon: 'bg-success/10 text-success border-0',
      headerExpanded: 'bg-success/[0.04] dark:bg-success/[0.08]',
      highlight: 'bg-success/[0.03] dark:bg-success/[0.06]',
    },
  }[theme];

  return (
    <div
      ref={sectionRef}
      className={cn(
        'transition-colors duration-300 bg-card/20 border-b border-border/80 last:border-b-0',
        highlighted && themeStyles.highlight,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors cursor-pointer select-none',
          isExpanded ? cn(themeStyles.headerExpanded, 'border-b border-border/50') : 'hover:bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'size-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
              themeStyles.icon,
            )}
          >
            <Icon className="size-4 shrink-0" />
          </div>
          <span className="font-semibold text-xs tracking-wide text-foreground">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {badge}
          <div className="size-6 rounded-md flex items-center justify-center text-muted-foreground">
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-300 ease-out',
                isExpanded && 'rotate-180 text-foreground',
              )}
            />
          </div>
        </div>
      </button>

      {/* Smooth CSS Grid transition for fluid expand and collapse */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 bg-background/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  projectId,
  sourceObject,
  targetSection = 'all',
  size = 'xl',
  className,
  onSave,
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

  // Controlled sections state (flat, no Radix height lock)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    transforms: true,
    fallbacks: true,
  });
  const [showRuleLibrary, setShowRuleLibrary] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Section element refs for smooth autoscroll
  const identityRef = useRef<HTMLDivElement>(null);
  const transformsRef = useRef<HTMLDivElement>(null);
  const fallbacksRef = useRef<HTMLDivElement>(null);

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

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

    // Auto-expansion & deep scroll based on targetSection
    if (!targetSection || targetSection === 'all') {
      setExpandedSections({
        identity: true,
        transforms: true,
        fallbacks: true,
      });
    } else {
      const isTransformsOrSkips =
        targetSection === 'transforms' || targetSection === 'skips';
      setExpandedSections({
        identity: targetSection === 'identity',
        transforms: isTransformsOrSkips,
        fallbacks: targetSection === 'fallbacks',
      });
      setHighlightedSection(isTransformsOrSkips ? 'transforms' : targetSection);
      const timer = setTimeout(() => {
        let refTarget: React.RefObject<HTMLDivElement | null> | null = null;
        if (isTransformsOrSkips) refTarget = transformsRef;
        else if (targetSection === 'fallbacks') refTarget = fallbacksRef;
        else if (targetSection === 'identity') refTarget = identityRef;

        if (refTarget?.current) {
          refTarget.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 150);

      const clearHighlight = setTimeout(
        () => setHighlightedSection(null),
        1800,
      );
      return () => {
        clearTimeout(timer);
        clearTimeout(clearHighlight);
      };
    }
  }, [open, mapping, destKey, targetSection]);

  // Smart suggestions
  const ruleSuggestions = useMemo(() => {
    if (!sourceFieldDef || !destFieldDef) return [];
    return buildRuleSuggestions({
      sourceField: sourceFieldDef,
      destField: destFieldDef,
      currentRules: rules,
    });
  }, [sourceFieldDef, destFieldDef, rules]);

  if (!mapping || !destKey) return null;

  const handleAddRuleFromLibrary = (def: RuleDefinition) => {
    if (!canUseTransforms && promptUpgrade) {
      promptUpgrade('Upgrade your plan to use transformation rules.');
      return;
    }
    setRules((prev) => [...prev, { type: def.type, enabled: true }]);
    setShowRuleLibrary(false);
  };

  const handleAddSuggestedRule = (suggestion: RuleSuggestion) => {
    if (!canUseTransforms && promptUpgrade) {
      promptUpgrade('Upgrade your plan to use transformation rules.');
      return;
    }
    setRules((prev) => [...prev, suggestion.rule]);
  };

  const handleSave = () => {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          DRAWER_SIZE_CLASSES[size],
          className,
        )}
        showCloseButton
      >
        {/* Fixed Header */}
        <SheetHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              size="xs"
              className="border-0 font-medium"
            >
              Field Settings &amp; Pipeline
            </Badge>
            {isMatch && (
              <Badge
                size="xs"
                className="border-0 bg-primary/15 text-primary font-medium gap-1"
              >
                <KeyRound className="size-3 text-primary shrink-0" />
                <span>Unique Identifier</span>
              </Badge>
            )}
            {destFieldDef?.required && (
              <Badge
                size="xs"
                className="border-0 bg-destructive/15 text-destructive font-medium"
              >
                Required
              </Badge>
            )}
            {rules.length > 0 && (
              <Badge
                size="xs"
                className="border-0 bg-warning/15 text-warning font-medium gap-1"
              >
                <Zap className="size-3 text-warning shrink-0" />
                <span>{rules.length} Rule{rules.length !== 1 ? 's' : ''}</span>
              </Badge>
            )}
          </div>
          <SheetTitle className="text-foreground mt-1 flex items-center gap-2 text-base font-semibold">
            <span className="truncate max-w-[280px]" title={sourceName}>
              {sourceName}
            </span>
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate max-w-[280px]" title={destName}>
              {destName}
            </span>
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            Configure record matching, transformation rules, and fallbacks in a single view.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Body: Split Grid on Desktop (xl), Single Column on smaller */}
        <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main Configuration Surface (Flat, unclipped, continuous divide) */}
          <div className="min-h-0 xl:overflow-y-auto divide-y divide-border/80 bg-background">
            {/* SECTION 1: Identity & Overwrite Policy */}
            <FlatSection
              title="1. Record Matching & Overwrite Policy"
              icon={KeyRound}
              theme="primary"
              badge={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {isMatch ? (
                    <Badge className="border-0 bg-primary/15 text-primary text-[10px] gap-1 font-semibold">
                      <KeyRound className="size-2.5 shrink-0" />
                      <span>Match ID</span>
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-muted text-muted-foreground text-[10px] font-normal">
                      Standard
                    </Badge>
                  )}
                  <Badge className="border-0 bg-secondary text-secondary-foreground text-[10px] font-normal">
                    {updatePolicy === 'always' ? 'Always Overwrite' : 'Create Only'}
                  </Badge>
                </div>
              }
              isExpanded={expandedSections.identity}
              onToggle={() => toggleSection('identity')}
              highlighted={highlightedSection === 'identity'}
              sectionRef={identityRef}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-0.5 min-w-0">
                    <Label
                      htmlFor="match-toggle"
                      className="text-foreground text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <KeyRound className="size-3.5 text-primary" />
                      <span>Unique Record Match Identifier</span>
                    </Label>
                    <p className="text-muted-foreground text-[11px] leading-tight">
                      Find existing records in destination by this field to update them instead of creating duplicates.
                    </p>
                  </div>
                  <Switch
                    id="match-toggle"
                    checked={isMatch}
                    onCheckedChange={setIsMatch}
                    aria-label="Unique Record Match Identifier"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium block">
                    When updating matched records:
                  </Label>
                  <RadioGroup
                    value={updatePolicy}
                    onValueChange={(val) =>
                      setUpdatePolicy(val as MappingUpdatePolicy)
                    }
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-colors',
                        updatePolicy === 'always'
                          ? 'border-primary/50 bg-primary/8 dark:bg-primary/10 text-foreground font-medium'
                          : 'border-border/70 hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <RadioGroupItem value="always" className="mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-foreground block font-semibold text-xs">
                          Always overwrite
                        </span>
                        <span className="text-muted-foreground text-[10px] leading-tight block">
                          Update destination field on every sync run.
                        </span>
                      </div>
                    </label>

                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-colors',
                        updatePolicy === 'create_only'
                          ? 'border-primary/50 bg-primary/8 dark:bg-primary/10 text-foreground font-medium'
                          : 'border-border/70 hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <RadioGroupItem value="create_only" className="mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-foreground block font-semibold text-xs">
                          Create only
                        </span>
                        <span className="text-muted-foreground text-[10px] leading-tight block">
                          Write on record creation only; preserve manual edits.
                        </span>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              </div>
            </FlatSection>

            {/* SECTION 2: Data Cleaning & Transformations */}
            <FlatSection
              title="2. Data Cleaning & Transformation Pipeline"
              icon={Zap}
              theme="warning"
              badge={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {rules.length > 0 ? (
                    <Badge className="border-0 bg-warning/15 text-warning text-[10px] gap-1 font-semibold">
                      <Zap className="size-2.5 shrink-0" />
                      <span>{rules.length} Rule{rules.length !== 1 ? 's' : ''}</span>
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-muted text-muted-foreground text-[10px] font-normal">
                      0 Rules (Direct Pass)
                    </Badge>
                  )}
                </div>
              }
              isExpanded={expandedSections.transforms}
              onToggle={() => toggleSection('transforms')}
              highlighted={highlightedSection === 'transforms'}
              sectionRef={transformsRef}
            >
              <div className="space-y-4">
                {/* Quick Presets Bar sitting directly on section surface */}
                <QuickPresetBar
                  rules={rules}
                  onRulesChange={setRules}
                  sourceFieldDef={sourceFieldDef}
                  destFieldDef={destFieldDef}
                  canUseTransforms={canUseTransforms}
                  onUpgradeRequired={() =>
                    promptUpgrade?.(
                      'Upgrade your plan to use transformation rules.',
                    )
                  }
                />

                {/* Rule suggestions if detected */}
                {ruleSuggestions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="size-3 text-warning" />
                      <span>Recommended for this mapping:</span>
                    </span>
                    {ruleSuggestions.map((sug) => (
                      <div
                        key={sug.id}
                        className="bg-warning/5 border border-warning/20 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground">
                            {sug.label}
                          </span>
                          <span className="text-muted-foreground text-[11px] block truncate">
                            {sug.reason}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="h-6.5 text-xs shrink-0 gap-1"
                          onClick={() => handleAddSuggestedRule(sug)}
                        >
                          <Plus className="size-3 text-warning" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Draggable Active Pipeline on flat surface */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Active Transformation Pipeline:
                    </Label>
                    {rules.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        Drag handle to reorder execution
                      </span>
                    )}
                  </div>

                  <DraggableRulePipeline
                    rules={rules}
                    onRulesChange={setRules}
                    destOptions={destFieldDef?.options}
                  />
                </div>

                {/* Add Rule Trigger with floating Popover */}
                <div className="pt-1">
                  <Popover open={showRuleLibrary} onOpenChange={setShowRuleLibrary}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 h-8.5 border-dashed hover:border-warning hover:text-warning transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5 text-warning" />
                        <span>Add Transformation Rule (Regex, Replace, Math, Dates...)</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      avoidCollisions={true}
                      collisionPadding={{ top: 24, bottom: 24, left: 16, right: 16 }}
                      sticky="always"
                      onWheelCapture={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-[min(calc(100vw-2rem),620px)] sm:w-[620px] max-h-[var(--radix-popover-content-available-height,calc(100vh-6rem))] p-0 gap-0 shadow-2xl border border-border rounded-2xl overflow-hidden bg-popover text-popover-foreground z-60 flex flex-col"
                    >
                      <RuleLibraryPopover
                        currentRules={rules}
                        onAddRule={(def) => {
                          handleAddRuleFromLibrary(def);
                          setShowRuleLibrary(false);
                        }}
                        onClose={() => setShowRuleLibrary(false)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </FlatSection>

            {/* SECTION 3: Empty Value Policy & Fallback */}
            <FlatSection
              title="3. Empty Value Policy & Fallback"
              icon={Settings2}
              theme="success"
              badge={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {onEmpty === 'default' ? (
                    <Badge className="border-0 bg-success/15 text-success text-[10px] font-semibold max-w-[140px] truncate">
                      Default: {defaultValue ? `"${defaultValue}"` : 'Fallback'}
                    </Badge>
                  ) : onEmpty === 'skip_record' ? (
                    <Badge className="border-0 bg-destructive/15 text-destructive text-[10px] font-semibold">
                      Skip If Empty
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-muted text-muted-foreground text-[10px] font-normal">
                      Pass Blank
                    </Badge>
                  )}
                </div>
              }
              isExpanded={expandedSections.fallbacks}
              onToggle={() => toggleSection('fallbacks')}
              highlighted={highlightedSection === 'fallbacks'}
              sectionRef={fallbacksRef}
            >
              <div className="space-y-3">
                <p className="text-muted-foreground text-[11px] leading-tight pb-0.5">
                  Destination safety policy. Evaluated after all transformations if the final value is blank or missing.
                </p>
                <RadioGroup
                  value={onEmpty}
                  onValueChange={(val) => setOnEmpty(val as OnEmptyPolicy)}
                  className="space-y-2"
                >
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-colors',
                      onEmpty === 'none'
                        ? 'border-success/50 bg-success/8 text-foreground font-medium'
                        : 'border-border/70 hover:bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <RadioGroupItem value="none" className="mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-foreground block font-semibold text-xs">
                        Leave empty / blank
                      </span>
                      <span className="text-muted-foreground text-[10px] block leading-tight">
                        Pass null or empty value directly to destination.
                      </span>
                    </div>
                  </label>

                  <div
                    className={cn(
                      'rounded-xl border transition-colors overflow-hidden',
                      onEmpty === 'default'
                        ? 'border-success/50 bg-success/5'
                        : 'border-border/70 hover:bg-muted/40',
                    )}
                  >
                    <label className="flex cursor-pointer items-start gap-2.5 p-2.5 text-xs">
                      <RadioGroupItem value="default" className="mt-0.5" />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-foreground block font-semibold text-xs">
                          Use a default fallback value
                        </span>
                        <span className="text-muted-foreground text-[10px] block leading-tight">
                          Write this fallback value whenever the source field is blank.
                        </span>
                      </div>
                    </label>

                    {onEmpty === 'default' && (
                      <div className="px-3 pb-3 pt-1 border-t border-success/20 bg-background/70 space-y-1.5">
                        <Label className="text-foreground block text-[11px] font-medium">
                          Default Fallback Value:
                        </Label>
                        {destFieldDef?.options &&
                        destFieldDef.options.length > 0 ? (
                          <Select
                            value={defaultValue}
                            onValueChange={setDefaultValue}
                          >
                            <SelectTrigger size="sm" className="h-8 w-full text-xs rounded-xl">
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
                            uiSize="sm"
                            value={defaultValue}
                            onChange={(e) => setDefaultValue(e.target.value)}
                            placeholder="e.g. N/A or Default..."
                            className="h-8 text-xs font-mono rounded-xl"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-colors',
                      onEmpty === 'skip_record'
                        ? 'border-destructive/60 bg-destructive/10 text-foreground font-medium'
                        : 'border-border/70 hover:bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <RadioGroupItem value="skip_record" className="mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-foreground block font-semibold text-xs">
                        Skip record if empty
                      </span>
                      <span className="text-muted-foreground text-[10px] block leading-tight">
                        Do not sync or create this record at all if this field is missing.
                      </span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </FlatSection>

            {/* Mobile / Tablet Live Rail fallback when viewport < xl */}
            <div className="block xl:hidden p-4 sm:p-5 bg-muted/20 border-t border-border/80">
              <FieldPipelineEffectRail
                sourceKey={sourceKey}
                destKey={currentDestKey}
                sourceFieldDef={sourceFieldDef}
                destFieldDef={destFieldDef}
                rules={rules}
                onEmpty={onEmpty}
                defaultValue={defaultValue}
                updatePolicy={updatePolicy}
                isMatch={isMatch}
                projectId={projectId}
                sourceObject={sourceObject}
                className="border rounded-xl bg-card shadow-2xs"
              />
            </div>
          </div>

          {/* Desktop Persistent Live Pipeline Effect Rail (xl) */}
          <div className="hidden xl:block min-h-0 h-full border-l border-border/80">
            <FieldPipelineEffectRail
              sourceKey={sourceKey}
              destKey={currentDestKey}
              sourceFieldDef={sourceFieldDef}
              destFieldDef={destFieldDef}
              rules={rules}
              onEmpty={onEmpty}
              defaultValue={defaultValue}
              updatePolicy={updatePolicy}
              isMatch={isMatch}
              projectId={projectId}
              sourceObject={sourceObject}
              className="h-full border-0"
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <SheetFooter className="bg-muted/20 shrink-0 border-t px-6 py-3.5">
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
              <Check className="mr-1.5 size-4" /> Save all settings
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
