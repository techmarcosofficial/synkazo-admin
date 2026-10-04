import { Check, Plus, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import type { Rule } from '@/lib/ruleEngine';
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

export interface QuickPresetBarProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  canUseTransforms?: boolean;
  onUpgradeRequired?: () => void;
  className?: string;
}

export default function QuickPresetBar({
  rules,
  onRulesChange,
  sourceFieldDef,
  destFieldDef,
  canUseTransforms = true,
  onUpgradeRequired,
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
        ...ALL_PRESETS.filter((p) => p.type !== 'lowercase' && p.type !== 'trim'),
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

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span>Quick Presets</span>
        </label>
        <span className="text-[11px] text-muted-foreground">
          Click to quickly add or remove
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sortedPresets.map((preset) => {
          const isActive = rules.some((r) => r.type === preset.type);

          return (
            <button
              key={preset.type}
              type="button"
              onClick={() => togglePreset(preset)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer border',
                isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-2xs hover:bg-primary/15'
                  : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
              title={preset.description}
            >
              {isActive ? (
                <Check className="size-3 text-primary shrink-0" />
              ) : (
                <Plus className="size-3 text-muted-foreground shrink-0" />
              )}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
