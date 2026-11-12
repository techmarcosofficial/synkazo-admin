import {
  ArrowRight,
  Check,
  CircleSlash,
  ListChecks,
  Plus,
  RotateCcw,
  Search,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import DraggableRulePipeline from '../DraggableRulePipeline';
import type { FieldDef } from '../FieldMappingCanvas';
import QuickPresetBar from '../QuickPresetBar';
import { ShownValue } from '../RuleCardParts';
import { CATEGORY_ICONS } from '../RuleLibraryPopover';

import SettingsSideNavLayout, { type SideNavItem } from './SettingsSideNav';
import { SettingRow, SettingRows, TabIntro } from './SettingRow';

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
  applyQuickSetting,
  isTextLikeField,
  readQuickSettings,
  type TextCase,
} from '@/lib/quickRuleSettings';
import {
  RULE_CATEGORIES,
  RULE_DEFINITIONS,
  type Rule,
  type RuleDefinition,
} from '@/lib/ruleEngine';
import { associationsApi } from '@/api/associations';
import { RULE_EXAMPLES, sampleValueFor } from '@/lib/ruleGuide';
import { buildRuleSuggestions } from '@/lib/ruleSuggestions';
import {
  runTransformPipeline,
  type PipelineResult,
} from '@/lib/transformRules.shared';
import { cn } from '@/lib/utils';

/** Short names for the side list; the engine's labels are longer. */
const CATEGORY_NAMES: Record<string, string> = {
  text: 'Text',
  length: 'Length',
  validation: 'Validation',
  conditional: 'Conditions',
  number: 'Numbers',
  date: 'Date & time',
  split: 'Split & merge',
  conversion: 'Type conversion',
};

/** "quick" | "applied" | a rule category id | "search". */
export type CleaningSection = string;

/** Where the tab should open: the rules already added, or quick cleanup. */
export function defaultCleaningSection(
  rules: Rule[],
  destFieldDef?: FieldDef,
): CleaningSection {
  if (rules.length > 0) return 'applied';
  return isTextLikeField(destFieldDef?.type) ? 'quick' : 'text';
}

const categoryOf = (type: string) =>
  RULE_DEFINITIONS.find((d) => d.type === type)?.category;

export default function DataCleaningTab({
  rules,
  onRulesChange,
  sourceFieldDef,
  destFieldDef,
  validationErrors,
  canUseTransforms,
  onUpgradeRequired,
  section,
  onSectionChange,
  projectId,
  sourceObject,
}: {
  projectId?: string;
  sourceObject?: string;
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  validationErrors: Record<number, string[]>;
  canUseTransforms: boolean;
  onUpgradeRequired: () => void;
  section: CleaningSection;
  onSectionChange: (section: CleaningSection) => void;
}) {
  const [search, setSearch] = useState('');
  // Live preview: a real value from the source when we can load one,
  // otherwise a believable sample for this kind of field.
  const fallbackSample = useMemo(
    () => sampleValueFor(sourceFieldDef ?? destFieldDef),
    [sourceFieldDef, destFieldDef],
  );
  const [sourceSample, setSourceSample] = useState<string | null>(null);
  const [testInput, setTestInput] = useState(fallbackSample);
  const sourceKey = sourceFieldDef?.key;
  useEffect(() => {
    if (!projectId || !sourceObject || !sourceKey) return;
    let cancelled = false;
    associationsApi
      .getSampleRecord(projectId, sourceObject)
      .then((record) => {
        const raw = record?.[sourceKey];
        if (cancelled || raw === undefined || raw === null) return;
        const value = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
        if (value.trim() === '') return;
        setSourceSample(value);
        setTestInput(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, sourceObject, sourceKey]);
  const preview = useMemo(
    () => runTransformPipeline(testInput, rules),
    [testInput, rules],
  );
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // Changes made outside Applied rules (quick cleanup, adding from a
  // category) flash the Applied rules tab so it's clear where they went.
  const [appliedFlash, setAppliedFlash] = useState(0);
  const lastRules = useRef(rules);
  useEffect(() => {
    if (lastRules.current === rules) return;
    lastRules.current = rules;
    if (section !== 'applied') setAppliedFlash((n) => n + 1);
  }, [rules, section]);
  const appliedRef = useRef<HTMLDivElement>(null);
  const quick = readQuickSettings(rules);
  const showQuick = isTextLikeField(destFieldDef?.type);
  // Suggestions depend only on the two fields, so chips don't reshuffle as
  // rules are added.
  const suggestions = useMemo(
    () =>
      sourceFieldDef && destFieldDef
        ? buildRuleSuggestions({
            sourceField: sourceFieldDef,
            destField: destFieldDef,
          })
        : [],
    [sourceFieldDef, destFieldDef],
  );
  const addedTypes = useMemo(() => new Set(rules.map((r) => r.type)), [rules]);

  // Rules are a paid feature: adding one on a plan without transforms asks
  // for an upgrade instead. Removing or editing existing rules stays allowed.
  const change = (next: Rule[]) => {
    if (!canUseTransforms && next.length > rules.length) {
      onUpgradeRequired();
      return;
    }
    onRulesChange(next);
  };

  // A rule that needs input (find/replace text, a format…) opens in Applied
  // rules straight away so it can be filled in; one that doesn't stays put.
  const addRule = (definition: RuleDefinition) => {
    if (!canUseTransforms) {
      onUpgradeRequired();
      return;
    }
    change([...rules, { type: definition.type, enabled: true }]);
    if (definition.params?.length) {
      setJustAdded(definition.type);
      onSectionChange('applied');
    }
  };

  useEffect(() => {
    if (section !== 'applied' || !justAdded) return;
    const id = requestAnimationFrame(() => {
      const rows = appliedRef.current?.querySelectorAll('[data-rule-index]');
      const last = rows?.[rows.length - 1] as HTMLElement | undefined;
      last?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      last?.querySelector<HTMLElement>('input, textarea, button[role="combobox"]')?.focus();
      setJustAdded(null);
    });
    return () => cancelAnimationFrame(id);
  }, [section, justAdded]);

  const query = search.trim().toLowerCase();
  const activeSection = query ? 'search' : section;

  const navItems: SideNavItem[] = [
    ...(showQuick || suggestions.length > 0
      ? [{ id: 'quick', label: 'Quick cleanup', icon: Wand2 }]
      : []),
    {
      id: 'applied',
      label: 'Applied rules',
      icon: ListChecks,
      count: rules.length,
      flashKey: appliedFlash,
    },
    ...RULE_CATEGORIES.map((category, i) => ({
      id: category.id,
      label: CATEGORY_NAMES[category.id] ?? category.label,
      icon: CATEGORY_ICONS[category.id],
      count: rules.filter((r) => categoryOf(r.type) === category.id).length,
      group: i === 0 ? 'Add rules' : undefined,
    })),
  ];

  const libraryList = (definitions: RuleDefinition[]) => (
    <ul className="divide-border/70 divide-y">
      {definitions.map((def) => {
        const added = addedTypes.has(def.type);
        return (
          <li
            key={def.type}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-foreground text-[13px] font-semibold">
                {def.label}
              </p>
              <p className="text-muted-foreground text-xs">{def.description}</p>
              <RuleExample type={def.type} />
            </div>
            {added ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  onSectionChange('applied');
                }}
                title="See it in Applied rules"
                className="text-success hover:bg-success/10 focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold outline-none focus-visible:ring-2"
              >
                <Check className="size-3.5" aria-hidden="true" />
                Added
                <span className="text-muted-foreground font-medium">
                  · View
                </span>
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2.5 text-xs"
                onClick={() => addRule(def)}
                aria-label={`Add ${def.label}`}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );

  let content: React.ReactNode;
  if (activeSection === 'search') {
    const found = RULE_DEFINITIONS.filter(
      (d) =>
        !d.legacy &&
        (d.label.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query)),
    );
    content = (
      <div className="space-y-2">
        <TabIntro
          title={`Rules matching “${search.trim()}”`}
          subtitle={`${found.length} found across all categories.`}
        />
        {found.length ? (
          libraryList(found)
        ) : (
          <p className="text-muted-foreground py-6 text-center text-xs">
            No rules match. Try another word, or pick a category on the left.
          </p>
        )}
      </div>
    );
  } else if (activeSection === 'quick') {
    content = (
      <div className="space-y-2">
        <TabIntro
          title="Data cleaning rules"
          subtitle="Common cleanups in one click. They are added as rules you can reorder."
        />
        {showQuick && (
          <SettingRows>
            <SettingRow
              label="Trim whitespace"
              htmlFor="quick-trim"
              hint="Remove spaces at the beginning and end"
            >
              <Switch
                id="quick-trim"
                checked={quick.trim}
                onCheckedChange={(value) =>
                  change(applyQuickSetting(rules, 'trim', value))
                }
              />
            </SettingRow>
            <SettingRow label="Text case" htmlFor="quick-case">
              <Select
                value={quick.textCase}
                onValueChange={(value) =>
                  change(
                    applyQuickSetting(rules, 'textCase', value as TextCase),
                  )
                }
              >
                <SelectTrigger
                  id="quick-case"
                  size="sm"
                  className="w-48 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep original</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              label="Maximum text length"
              htmlFor="quick-max-length"
              hint="Longer values are cut. Empty means no limit."
            >
              <Input
                id="quick-max-length"
                type="number"
                inputMode="numeric"
                min={1}
                uiSize="sm"
                value={quick.maxLength}
                placeholder="No limit"
                onChange={(event) =>
                  change(
                    applyQuickSetting(rules, 'maxLength', event.target.value),
                  )
                }
                className="w-48 text-xs"
              />
            </SettingRow>
          </SettingRows>
        )}
        <QuickPresetBar
          rules={rules}
          onRulesChange={onRulesChange}
          sourceFieldDef={sourceFieldDef}
          destFieldDef={destFieldDef}
          canUseTransforms={canUseTransforms}
          suggestions={suggestions}
          onAddSuggestion={(suggestion) => change([...rules, suggestion.rule])}
          onUpgradeRequired={onUpgradeRequired}
          className={cn(showQuick && 'border-border/70 border-t pt-3.5')}
        />
      </div>
    );
  } else if (activeSection === 'applied') {
    content = (
      <div className="space-y-3" ref={appliedRef}>
        <div className="flex items-start justify-between gap-3">
          <TabIntro
            title="Applied rules"
            subtitle="Rules run top to bottom before data is sent."
          />
          {rules.length > 1 && (
            <span className="text-muted-foreground shrink-0 pt-1 text-[11px]">
              Drag to reorder
            </span>
          )}
        </div>
        {rules.length > 0 && (
          <TryItPanel
            input={testInput}
            onInputChange={setTestInput}
            sourceSample={sourceSample}
            onReset={() => setTestInput(sourceSample ?? fallbackSample)}
            result={preview}
          />
        )}
        {rules.length > 0 ? (
          <DraggableRulePipeline
            rules={rules}
            onRulesChange={onRulesChange}
            destOptions={destFieldDef?.options}
            validationErrors={validationErrors}
            trace={preview.steps}
          />
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-foreground text-[13px] font-semibold">
              No rules yet
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Pick a category on the left to see its rules and add one.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 h-7 gap-1 text-xs"
              onClick={() => onSectionChange('text')}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Browse text rules
            </Button>
          </div>
        )}
      </div>
    );
  } else {
    const category = RULE_CATEGORIES.find((c) => c.id === activeSection);
    const definitions = RULE_DEFINITIONS.filter(
      (d) => d.category === activeSection && !d.legacy,
    );
    content = (
      <div className="space-y-2">
        <TabIntro
          title={`${CATEGORY_NAMES[activeSection] ?? category?.label ?? ''} rules`}
          subtitle="Each shows an example. Rules that need a setting open in Applied rules so you can fill it in and see the result."
        />
        {libraryList(definitions)}
      </div>
    );
  }

  return (
    <SettingsSideNavLayout
      label="Data cleaning sections"
      items={navItems}
      active={activeSection}
      onSelect={(id) => {
        setSearch('');
        onSectionChange(id);
      }}
      header={
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            uiSize="sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rules"
            aria-label="Search rules"
            className="h-8 pl-8 text-xs"
          />
        </div>
      }
    >
      {content}
    </SettingsSideNavLayout>
  );
}

/** "input → output" for a rule, run through the real engine. */
function RuleExample({ type }: { type: string }) {
  const example = RULE_EXAMPLES[type];
  if (!example) return null;
  const result = runTransformPipeline(example.input, [
    { type, enabled: true, ...example.params },
  ]);
  return (
    <p className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
      <span>e.g.</span>
      <ShownValue value={example.input} />
      <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
      {result.skip ? (
        <span className="text-destructive font-medium">
          {result.skip.skip === 'record' ? 'record not synced' : 'field not sent'}
        </span>
      ) : (
        <ShownValue value={String(result.value)} />
      )}
    </p>
  );
}

/** The live preview at the top of Applied rules. */
function TryItPanel({
  input,
  onInputChange,
  sourceSample,
  onReset,
  result,
}: {
  input: string;
  onInputChange: (value: string) => void;
  sourceSample: string | null;
  onReset: () => void;
  result: PipelineResult;
}) {
  const resetTo = sourceSample ?? null;
  return (
    <section
      aria-label="Try your rules"
      className="bg-muted/40 space-y-2.5 rounded-xl border px-3.5 py-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor="rule-preview-input"
            className="text-foreground text-xs font-semibold"
          >
            Try it
            <span className="text-muted-foreground ml-1.5 font-normal">
              {sourceSample !== null && input === sourceSample
                ? 'A real value from your source'
                : 'Type any value to test'}
            </span>
          </label>
          <Input
            id="rule-preview-input"
            uiSize="sm"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            className="bg-background h-8 font-mono text-xs"
          />
        </div>
        {(resetTo === null || input !== resetTo) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={onReset}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            {sourceSample !== null ? 'Source value' : 'Sample'}
          </Button>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Sent to HubSpot:</span>
        {result.skip ? (
          <span className="text-destructive flex items-center gap-1 font-semibold">
            <CircleSlash className="size-3.5" aria-hidden="true" />
            {result.skip.skip === 'record'
              ? 'Record not synced'
              : 'Nothing (field skipped)'}
            <span className="text-muted-foreground font-normal">
              · {result.skip.reason}
            </span>
          </span>
        ) : (
          <ShownValue value={String(result.value ?? '')} />
        )}
      </div>
    </section>
  );
}
