import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import DraggableRulePipeline from '../DraggableRulePipeline';
import type { FieldDef } from '../FieldMappingCanvas';
import QuickPresetBar from '../QuickPresetBar';
import RuleLibraryPopover from '../RuleLibraryPopover';

import { SettingRow, SettingRows, TabIntro } from './SettingRow';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import type { Rule, RuleDefinition } from '@/lib/ruleEngine';
import { buildRuleSuggestions } from '@/lib/ruleSuggestions';

export default function DataCleaningTab({
  rules,
  onRulesChange,
  sourceFieldDef,
  destFieldDef,
  validationErrors,
  canUseTransforms,
  onUpgradeRequired,
}: {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  validationErrors: Record<number, string[]>;
  canUseTransforms: boolean;
  onUpgradeRequired: () => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
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

  // Rules are a paid feature: adding one on a plan without transforms asks
  // for an upgrade instead. Removing or editing existing rules stays allowed.
  const change = (next: Rule[]) => {
    if (!canUseTransforms && next.length > rules.length) {
      onUpgradeRequired();
      return;
    }
    onRulesChange(next);
  };

  const addFromLibrary = (definition: RuleDefinition) => {
    setLibraryOpen(false);
    change([...rules, { type: definition.type, enabled: true }]);
  };

  return (
    <div className="space-y-2">
      <TabIntro
        title="Data cleaning rules"
        subtitle="Rules run top to bottom before data is sent."
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
                change(applyQuickSetting(rules, 'textCase', value as TextCase))
              }
            >
              <SelectTrigger id="quick-case" size="sm" className="w-48 text-xs">
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
        className="border-border/70 border-t pt-3.5"
      />

      {rules.length > 0 && (
        <div className="space-y-2 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-foreground text-[13px] font-semibold">
              Applied rules
            </h4>
            {rules.length > 1 && (
              <span className="text-muted-foreground text-[11px]">
                Drag to reorder
              </span>
            )}
          </div>
          <DraggableRulePipeline
            rules={rules}
            onRulesChange={onRulesChange}
            destOptions={destFieldDef?.options}
            validationErrors={validationErrors}
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Popover open={libraryOpen} onOpenChange={setLibraryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 border-transparent bg-(--brand-orange) px-3.5 text-xs font-medium text-white shadow-xs hover:bg-(--brand-orange)/90"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add transformation rule
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            collisionPadding={{ top: 24, bottom: 24, left: 16, right: 16 }}
            sticky="always"
            onWheelCapture={(event) => event.stopPropagation()}
            className="bg-popover text-popover-foreground z-60 flex max-h-(--radix-popover-content-available-height) w-[min(calc(100vw-2rem),490px)] flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl"
          >
            <RuleLibraryPopover
              currentRules={rules}
              onAddRule={addFromLibrary}
              onClose={() => setLibraryOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
