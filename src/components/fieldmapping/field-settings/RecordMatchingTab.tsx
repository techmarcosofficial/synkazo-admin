import { Info } from 'lucide-react';

import type { MappingUpdatePolicy } from '../FieldMappingCanvas';

import { SettingRow, SettingRows, TabIntro } from './SettingRow';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
  return (
    <div className="space-y-2">
      <TabIntro
        title="How should records be matched?"
        subtitle="Use this field to find existing records and prevent duplicates."
      />
      <SettingRows>
        <SettingRow
          label="Use as match key"
          htmlFor="field-match-key"
          info="Synkazo looks up existing destination records by this field and updates them instead of creating duplicates."
        >
          <Switch
            id="field-match-key"
            checked={isMatch}
            onCheckedChange={onMatchChange}
          />
          {isMatch && (
            <span className="text-success text-[11px] font-semibold tracking-wide uppercase">
              Primary key
            </span>
          )}
        </SettingRow>
        <SettingRow
          label="When a match is found"
          htmlFor="field-update-policy"
          info="Update this field: overwrite it on every sync. Only set when creating: write it once, and keep later edits made in the destination."
        >
          <Select
            value={updatePolicy}
            onValueChange={(value) =>
              onUpdatePolicyChange(value as MappingUpdatePolicy)
            }
          >
            <SelectTrigger
              id="field-update-policy"
              size="sm"
              className="w-56 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Update this field</SelectItem>
              <SelectItem value="create_only">
                Only set when creating
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingRows>
      {isMatch && (
        <p className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          This field is the match key. Existing records with the same value are
          updated instead of duplicated.
        </p>
      )}
    </div>
  );
}
