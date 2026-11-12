import { Info, KeyRound, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import type { MappingUpdatePolicy } from '../FieldMappingCanvas';

import SettingsSideNavLayout from './SettingsSideNav';
import { SettingRow, SettingRows, TabIntro } from './SettingRow';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type Section = 'identifier' | 'updates';

const UPDATE_OPTIONS: Array<{
  value: MappingUpdatePolicy;
  title: string;
  description: string;
}> = [
  {
    value: 'always',
    title: 'Always overwrite',
    description: 'Update this field on every sync.',
  },
  {
    value: 'create_only',
    title: 'Create only',
    description:
      'Write it when the record is created, and keep later edits made in the destination.',
  },
];

export default function RecordMatchingTab({
  isMatch,
  onMatchChange,
  updatePolicy,
  onUpdatePolicyChange,
}: {
  isMatch: boolean;
  onMatchChange: (value: boolean) => void;
  updatePolicy: MappingUpdatePolicy;
  onUpdatePolicyChange: (value: MappingUpdatePolicy) => void;
}) {
  const [section, setSection] = useState<Section>('identifier');

  return (
    <SettingsSideNavLayout
      label="Record matching sections"
      active={section}
      onSelect={(id) => setSection(id as Section)}
      items={[
        {
          id: 'identifier',
          label: 'Identifier',
          icon: KeyRound,
          configured: isMatch,
        },
        {
          id: 'updates',
          label: 'On existing records',
          icon: RefreshCw,
          configured: updatePolicy !== 'always',
        },
      ]}
    >
      {section === 'identifier' ? (
        <div className="space-y-2">
          <TabIntro
            title="How should records be matched?"
            subtitle="Use this field to find existing records and prevent duplicates."
          />
          <SettingRows>
            <SettingRow
              label="Use as identifier"
              htmlFor="field-match-key"
              info="Synkazo looks up existing destination records by this field and updates them, instead of creating duplicates."
            >
              <Switch
                id="field-match-key"
                checked={isMatch}
                onCheckedChange={onMatchChange}
              />
              {isMatch && (
                <span className="text-success text-[11px] font-semibold tracking-wide uppercase">
                  Identifier
                </span>
              )}
            </SettingRow>
          </SettingRows>
          {isMatch && (
            <p className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              This field is the identifier. Existing records with the same value
              are updated instead of duplicated.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <TabIntro
            title="On existing records"
            subtitle="When a matching record already exists in the destination."
          />
          <RadioGroup
            value={updatePolicy}
            onValueChange={(value) =>
              onUpdatePolicyChange(value as MappingUpdatePolicy)
            }
            aria-label="On existing records"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {UPDATE_OPTIONS.map((option) => {
              const selected = updatePolicy === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                    selected
                      ? 'border-primary/50 bg-primary/8 dark:bg-primary/10'
                      : 'border-border/70 hover:bg-muted/40',
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    aria-label={option.title}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span className="text-foreground block text-xs font-semibold">
                      {option.title}
                    </span>
                    <span className="text-muted-foreground block text-[11px] leading-snug">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </div>
      )}
    </SettingsSideNavLayout>
  );
}
