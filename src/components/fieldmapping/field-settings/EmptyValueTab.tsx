import type { FieldDef, OnEmptyPolicy } from '../FieldMappingCanvas';

import { SettingRow, SettingRows, TabIntro } from './SettingRow';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POLICY_INFO =
  'Leave blank: write the empty value as it is. Use a default value: write the value you set instead. Skip the record: don’t sync the whole record.';

function EmptyPolicyRows({
  idPrefix,
  options,
  onEmpty,
  onOnEmptyChange,
  defaultValue,
  onDefaultValueChange,
}: {
  idPrefix: string;
  options?: FieldDef['options'];
  onEmpty: OnEmptyPolicy;
  onOnEmptyChange: (value: OnEmptyPolicy) => void;
  defaultValue: string;
  onDefaultValueChange: (value: string) => void;
}) {
  return (
    <SettingRows>
      <SettingRow
        label="Empty source value"
        htmlFor={`${idPrefix}-on-empty`}
        info={POLICY_INFO}
      >
        <Select
          value={onEmpty}
          onValueChange={(value) => onOnEmptyChange(value as OnEmptyPolicy)}
        >
          <SelectTrigger
            id={`${idPrefix}-on-empty`}
            size="sm"
            className="w-56 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Leave blank</SelectItem>
            <SelectItem value="default">Use a default value</SelectItem>
            <SelectItem value="skip_record">Skip the record</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      {onEmpty === 'default' && (
        <SettingRow label="Default value" htmlFor={`${idPrefix}-default`}>
          {options && options.length > 0 ? (
            <Select value={defaultValue} onValueChange={onDefaultValueChange}>
              <SelectTrigger
                id={`${idPrefix}-default`}
                size="sm"
                className="w-56 text-xs"
              >
                <SelectValue placeholder="Choose a value" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label || option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`${idPrefix}-default`}
              uiSize="sm"
              value={defaultValue}
              onChange={(event) => onDefaultValueChange(event.target.value)}
              placeholder="Enter fallback value"
              className="w-56 text-xs"
            />
          )}
        </SettingRow>
      )}
    </SettingRows>
  );
}

export default function EmptyValueTab({
  destFieldDef,
  isTwoWay,
  onEmpty,
  onOnEmptyChange,
  defaultValue,
  onDefaultValueChange,
  reverseOnEmpty,
  onReverseOnEmptyChange,
  reverseDefaultValue,
  onReverseDefaultValueChange,
  sourceFieldDef,
}: {
  destFieldDef?: FieldDef;
  sourceFieldDef?: FieldDef;
  isTwoWay: boolean;
  onEmpty: OnEmptyPolicy;
  onOnEmptyChange: (value: OnEmptyPolicy) => void;
  defaultValue: string;
  onDefaultValueChange: (value: string) => void;
  reverseOnEmpty: OnEmptyPolicy;
  onReverseOnEmptyChange: (value: OnEmptyPolicy) => void;
  reverseDefaultValue: string;
  onReverseDefaultValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <TabIntro
        title="What happens when the value is empty?"
        subtitle="Runs after your rules, when the final value is blank."
      />
      <EmptyPolicyRows
        idPrefix="field-empty"
        options={destFieldDef?.options}
        onEmpty={onEmpty}
        onOnEmptyChange={onOnEmptyChange}
        defaultValue={defaultValue}
        onDefaultValueChange={onDefaultValueChange}
      />
      {isTwoWay && (
        <div className="space-y-1 pt-4">
          <h4 className="text-foreground text-[13px] font-semibold">
            Reverse direction
          </h4>
          <p className="text-muted-foreground text-xs">
            When the value syncs back from the destination.
          </p>
          <EmptyPolicyRows
            idPrefix="field-reverse-empty"
            options={sourceFieldDef?.options}
            onEmpty={reverseOnEmpty}
            onOnEmptyChange={onReverseOnEmptyChange}
            defaultValue={reverseDefaultValue}
            onDefaultValueChange={onReverseDefaultValueChange}
          />
        </div>
      )}
    </div>
  );
}
