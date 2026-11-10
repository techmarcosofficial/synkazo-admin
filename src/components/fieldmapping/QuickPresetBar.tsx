import { Check, Plus, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import InfoTip from '@/components/shared/InfoTip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Rule } from '@/lib/ruleEngine';
import type { RuleSuggestion } from '@/lib/ruleSuggestions';
import { cn } from '@/lib/utils';
import type { FieldDef } from './FieldMappingCanvas';

interface QuickPreset {
  type: string;
  label: string;
  description: string;
  exclusiveWith?: string[];
}

const ALL_PRESETS: QuickPreset[] = [
  {
    type: 'trim',
    label: 'Trim Spaces',
    description: 'Remove leading and trailing spaces',
  },
  {
    type: 'capitalize',
    label: 'Title Case',
    description: 'Capitalize each word',
    exclusiveWith: ['uppercase', 'lowercase'],
  },
  {
    type: 'uppercase',
    label: 'UPPERCASE',
    description: 'Convert to capital letters',
    exclusiveWith: ['capitalize', 'lowercase'],
  },
  {
    type: 'lowercase',
    label: 'lowercase',
    description: 'Convert to lowercase',
    exclusiveWith: ['capitalize', 'uppercase'],
  },
  {
    type: 'phone_format',
    label: 'Standard Phone',
    description: 'Format phone to standard format',
  },
  {
    type: 'remove_spaces',
    label: 'Remove All Spaces',
    description: 'Strip all whitespace',
  },
];

interface PresetChip extends QuickPreset {
  key: string;
  suggestion?: RuleSuggestion;
}

export interface QuickPresetBarProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  canUseTransforms?: boolean;
  onUpgradeRequired?: () => void;
  /** Rules suggested for this field pair. They show as orange chips first in
   *  the row; one that matches a preset marks that preset instead. */
  suggestions?: RuleSuggestion[];
  onAddSuggestion?: (suggestion: RuleSuggestion) => void;
  className?: string;
}

function SuggestedMark({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 cursor-help">
          <Sparkles className="text-warning size-3" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-snug">
        <span>
          <span className="font-semibold">Suggested.</span> {reason}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

export default function QuickPresetBar({
  rules,
  onRulesChange,
  sourceFieldDef,
  destFieldDef,
  canUseTransforms = true,
  onUpgradeRequired,
  suggestions = [],
  onAddSuggestion,
  className,
}: QuickPresetBarProps) {
  // Sort presets contextually based on field type
  const sortedPresets = useMemo(() => {
    const sType = (sourceFieldDef?.type || '').toLowerCase();
    const dType = (destFieldDef?.type || '').toLowerCase();
    const isPhone = sType.includes('phone') || dType.includes('phone');
    const isEmail = sType.includes('email') || dType.includes('email');

    if (isPhone) {
      return [
        ALL_PRESETS.find((p) => p.type === 'phone_format')!,
        ALL_PRESETS.find((p) => p.type === 'trim')!,
        ...ALL_PRESETS.filter(
          (p) => p.type !== 'phone_format' && p.type !== 'trim',
        ),
      ];
    }
    if (isEmail) {
      return [
        ALL_PRESETS.find((p) => p.type === 'trim')!,
        ALL_PRESETS.find((p) => p.type === 'lowercase')!,
        ...ALL_PRESETS.filter(
          (p) => p.type !== 'lowercase' && p.type !== 'trim',
        ),
      ];
    }
    return ALL_PRESETS;
  }, [sourceFieldDef?.type, destFieldDef?.type]);

  const togglePreset = (preset: QuickPreset) => {
    if (!canUseTransforms && onUpgradeRequired) {
      onUpgradeRequired();
      return;
    }

    const exists = rules.some((r) => r.type === preset.type);
    if (exists) {
      onRulesChange(rules.filter((r) => r.type !== preset.type));
      return;
    }

    let cleaned = rules;
    if (preset.exclusiveWith && preset.exclusiveWith.length > 0) {
      cleaned = rules.filter((r) => !preset.exclusiveWith!.includes(r.type));
    }
    onRulesChange([...cleaned, { type: preset.type, enabled: true }]);
  };

  // One row: suggested chips first (orange, sparkle), then the remaining
  // presets. A suggestion that is also a preset marks that preset.
  const chips = useMemo<PresetChip[]>(() => {
    const presetTypes = new Set(sortedPresets.map((p) => p.type));
    const byType = new Map(suggestions.map((sug) => [sug.rule.type, sug]));
    const suggestedPresets = sortedPresets
      .filter((p) => byType.has(p.type))
      .map((p) => ({ ...p, key: p.type, suggestion: byType.get(p.type) }));
    const extraSuggestions = suggestions
      .filter((sug) => !presetTypes.has(sug.rule.type))
      .map((sug) => ({
        key: sug.id,
        type: sug.rule.type,
        label: sug.label,
        description: sug.reason,
        suggestion: sug,
      }));
    const rest = sortedPresets
      .filter((p) => !byType.has(p.type))
      .map((p) => ({ ...p, key: p.type }));
    return [...suggestedPresets, ...extraSuggestions, ...rest];
  }, [sortedPresets, suggestions]);

  const toggleChip = (chip: PresetChip) => {
    const preset = ALL_PRESETS.find((p) => p.type === chip.type);
    if (preset) {
      togglePreset(preset);
      return;
    }
    if (!canUseTransforms && onUpgradeRequired) {
      onUpgradeRequired();
      return;
    }
    if (rules.some((r) => r.type === chip.type)) {
      onRulesChange(rules.filter((r) => r.type !== chip.type));
    } else if (chip.suggestion) {
      onAddSuggestion?.(chip.suggestion);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="text-primary size-3.5" />
          <span>Quick presets</span>
          <InfoTip label="About quick presets">
            Click a preset to add it as a rule. Click it again to remove it.
            Orange presets with a sparkle are suggested for this field.
          </InfoTip>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const isActive = rules.some((r) => r.type === chip.type);
            const suggested = Boolean(chip.suggestion);

            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggleChip(chip)}
                aria-pressed={isActive}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15 shadow-2xs'
                    : suggested
                      ? 'border-warning/50 bg-warning/10 text-foreground hover:bg-warning/15'
                      : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                title={suggested ? undefined : chip.description}
              >
                {isActive ? (
                  <Check className="text-primary size-3 shrink-0" />
                ) : (
                  <Plus
                    className={cn(
                      'size-3 shrink-0',
                      suggested ? 'text-warning' : 'text-muted-foreground',
                    )}
                  />
                )}
                <span>{chip.label}</span>
                {chip.suggestion && (
                  <>
                    <span className="sr-only">
                      (suggested: {chip.suggestion.reason})
                    </span>
                    <SuggestedMark reason={chip.suggestion.reason} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
