import { Check, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import EmptyValuePolicy, {
  isValidDefaultValue,
  type RequiredReason,
} from './EmptyValuePolicy';
import {
  addConstantRow,
  setPairEmptyPolicy,
  FieldSelect,
  PLATFORM_LABEL,
  type FieldDef,
  type MappingRow,
  type OnEmptyPolicy,
} from './FieldMappingCanvas';

import { PlatformIcon } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildRequiredFieldItem,
  getRequiredFieldItems,
  type RequiredFieldItem,
} from '@/lib/requiredFields';
import { cn } from '@/lib/utils';

const itemKey = (item: RequiredFieldItem) => `${item.side}:${item.field.key}`;

export interface RequiredFieldDefaultsProps {
  sourceFields: FieldDef[];
  destFields: FieldDef[];
  sourcePlatform: string;
  destPlatform: string;
  mappings: MappingRow[];
  onMappingsChange: (mappings: MappingRow[]) => void;
  /** 'two_way' lists both source- and destination-required fields; 'dest_only'
   *  (one-way jobs) lists destination-required fields only — the source side is
   *  never written to on a one-way job, so its required flag never applies. */
  scope: 'two_way' | 'dest_only';
  /** Fires whenever "every required field currently has a policy" changes —
   *  driven directly by `mappings`, since every edit here commits immediately. */
  onResolvedChange?: (resolved: boolean) => void;
  /** True once the caller attempted a save that was blocked because a "Use a
   *  default value" field was left blank — turns those inputs red instead of
   *  staying unstyled, so leaving one empty has a visible consequence at the
   *  moment it actually matters rather than nagging while the user is mid-edit. */
  showValidation?: boolean;
}

/**
 * Lists every required field — source and destination — that a platform will
 * reject an empty value for, already open, with exactly two choices: a
 * default value, or skip the record. Replaces the old per-row popover and the
 * manual "Default Values" picker with one auto-populated place to resolve
 * all of it, plus an optional secondary spot to add a default for a field
 * that isn't required.
 *
 * Every change here commits straight into `mappings` via `onMappingsChange`
 * (same as any other canvas edit) — there is no local draft state and no
 * Save button of its own. The job-level "Save Mappings" button is the single
 * place that persists.
 */
export default function RequiredFieldDefaults({
  sourceFields,
  destFields,
  sourcePlatform,
  destPlatform,
  mappings,
  onMappingsChange,
  scope,
  onResolvedChange,
  showValidation = false,
}: RequiredFieldDefaultsProps) {
  const includeSource = scope === 'two_way';
  const requiredItems = getRequiredFieldItems(
    sourceFields,
    destFields,
    mappings,
    {
      includeSource,
      includeDest: true,
    },
  );
  const requiredKeySet = {
    source: new Set(
      requiredItems.filter((i) => i.side === 'source').map((i) => i.field.key),
    ),
    dest: new Set(
      requiredItems.filter((i) => i.side === 'dest').map((i) => i.field.key),
    ),
  };

  // Fields the user opted to also set a default for, even though the platform
  // doesn't require them. Two sources, merged: an already-persisted policy is
  // reconstructed from `mappings` every render (so it survives a reload —
  // `mappings` is what actually came back from the API), and a field the user
  // just picked this session but hasn't set a policy for yet only exists in
  // `extraFields`, since there's nothing in `mappings` to derive it from until
  // a policy is committed.
  const persistedExtraKeys: { side: 'source' | 'dest'; key: string }[] = [];
  {
    const seen = new Set<string>();
    const addIfNew = (side: 'source' | 'dest', key: string) => {
      const k = `${side}:${key}`;
      if (seen.has(k)) return;
      seen.add(k);
      persistedExtraKeys.push({ side, key });
    };
    for (const m of mappings) {
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      for (const dk of dests) {
        if (!dk) continue;
        if (
          (m.destOnEmpty?.[dk] ?? 'none') !== 'none' &&
          !requiredKeySet.dest.has(dk)
        ) {
          addIfNew('dest', dk);
        }
        if (
          includeSource &&
          m.sourceField &&
          (m.destReverseOnEmpty?.[dk] ?? 'none') !== 'none' &&
          !requiredKeySet.source.has(m.sourceField)
        ) {
          addIfNew('source', m.sourceField);
        }
      }
    }
  }

  const [extraFields, setExtraFields] = useState<
    { side: 'source' | 'dest'; key: string }[]
  >([]);
  // extraFields first (most-recently-added first, since it's unshifted below) so a
  // field the user just added keeps its place at the top of "Also set" instead of
  // jumping to wherever persistedExtraKeys' mapping-array order would put it.
  const extraKeys = [...extraFields, ...persistedExtraKeys].filter(
    (e, i, arr) =>
      arr.findIndex((o) => o.side === e.side && o.key === e.key) === i,
  );
  const extraItems: RequiredFieldItem[] = extraKeys
    .map(({ side, key }) => {
      const field = (side === 'source' ? sourceFields : destFields).find(
        (f) => f.key === key,
      );
      return field ? buildRequiredFieldItem(field, side, mappings) : null;
    })
    .filter((i): i is RequiredFieldItem => i !== null);

  // Resolved means the current committed value (not a draft) is actually usable —
  // 'skip_record' always is, 'default' only once its value passes validation.
  const isResolved = (item: RequiredFieldItem): boolean =>
    item.currentOnEmpty === 'skip_record' ||
    (item.currentOnEmpty === 'default' &&
      isValidDefaultValue(item.field.type, item.currentDefaultValue));

  const fullyResolved = requiredItems.every(isResolved);
  useEffect(() => {
    onResolvedChange?.(fullyResolved);
  }, [fullyResolved, onResolvedChange]);

  const commit = (
    item: RequiredFieldItem,
    next: { onEmpty: OnEmptyPolicy; defaultValue: string },
  ) => {
    let updated = mappings;
    if (item.pairs.length > 0) {
      for (const pair of item.pairs) {
        updated = setPairEmptyPolicy(updated, pair, next, item.side);
      }
    } else {
      updated = addConstantRow(updated, {
        side: item.side,
        // Built from sourceFields/destFields (typed FieldDef[]) — RequiredFieldItem
        // widens the field type to the leaf RequiredFieldLike shape, this narrows back.
        field: item.field as FieldDef,
        onEmpty: next.onEmpty,
        defaultValue: next.defaultValue,
        isTwoWay: scope === 'two_way',
      });
    }
    onMappingsChange(updated);
  };

  const [addingExtra, setAddingExtra] = useState(false);
  const [extraDraftSide, setExtraDraftSide] = useState<'source' | 'dest'>(
    'dest',
  );
  const [extraDraftKey, setExtraDraftKey] = useState('');

  const requiredKeys = {
    source: new Set(sourceFields.filter((f) => f.required).map((f) => f.key)),
    dest: new Set(destFields.filter((f) => f.required).map((f) => f.key)),
  };
  const extraCandidateFields = (
    extraDraftSide === 'source' ? sourceFields : destFields
  ).filter(
    (f) =>
      !f.readOnly &&
      !requiredKeys[extraDraftSide].has(f.key) &&
      !extraKeys.some((e) => e.side === extraDraftSide && e.key === f.key),
  );

  const resolvedCount = requiredItems.filter(isResolved).length;

  const renderItem = (item: RequiredFieldItem, removable = false) => {
    const platformLabel =
      item.side === 'dest'
        ? (PLATFORM_LABEL[destPlatform] ?? destPlatform)
        : (PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform);
    const otherPlatformLabel =
      item.side === 'dest'
        ? (PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform)
        : (PLATFORM_LABEL[destPlatform] ?? destPlatform);
    const reasons: RequiredReason[] = item.field.required
      ? [
          {
            platformLabel,
            otherPlatformLabel,
            fieldLabel: item.field.label || item.field.key,
            options: item.field.options,
            fieldType: item.field.type,
            context: item.side === 'dest' ? 'write' : 'writeback',
          },
        ]
      : [];
    return (
      <Card
        key={itemKey(item)}
        className="ring-border gap-3 py-4 shadow-none ring-1"
      >
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex items-center gap-2">
            <PlatformIcon
              platformId={item.side === 'dest' ? destPlatform : sourcePlatform}
              size={16}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {item.field.label || item.field.key}
              {item.field.required && (
                <span className="text-destructive ml-0.5">*</span>
              )}
            </span>
            {isResolved(item) && (
              <Badge variant="secondary" className="gap-1">
                <Check className="size-3" /> Resolved
              </Badge>
            )}
            {removable && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  commit(item, { onEmpty: 'none', defaultValue: '' });
                  setExtraFields((prev) =>
                    prev.filter(
                      (e) =>
                        !(e.side === item.side && e.key === item.field.key),
                    ),
                  );
                }}
              >
                <X />
              </Button>
            )}
          </div>
          <EmptyValuePolicy
            reasons={reasons}
            forceShowInvalid={showValidation}
            value={{
              onEmpty: item.currentOnEmpty,
              defaultValue: item.currentDefaultValue,
            }}
            onChange={(v) => commit(item, v)}
          />
        </CardContent>
      </Card>
    );
  };

  // Required-only — "Also set" (optional, user-picked) fields get their own section
  // above this one instead of being mixed in, so this column only ever shows what
  // the platform actually requires, same as the asterisk already implies.
  const sourceItems = requiredItems.filter((i) => i.side === 'source');
  const destItems = requiredItems.filter((i) => i.side === 'dest');
  const showSourceColumn = includeSource && sourceFields.length > 0;

  const addExtraControl = (
    <div className="flex flex-wrap items-center gap-2">
      {includeSource && (
        <Select
          value={extraDraftSide}
          onValueChange={(v) => {
            setExtraDraftSide(v as 'source' | 'dest');
            setExtraDraftKey('');
          }}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">
              {PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform}
            </SelectItem>
            <SelectItem value="dest">
              {PLATFORM_LABEL[destPlatform] ?? destPlatform}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
      <div className="min-w-56 flex-1">
        <FieldSelect
          fields={extraCandidateFields}
          value={extraDraftKey}
          onChange={setExtraDraftKey}
          placeholder="Field to set a default for…"
          highlightRequired={false}
        />
      </div>
      <Button
        size="sm"
        disabled={!extraDraftKey}
        onClick={() => {
          // Unshift, not push — the field the user just picked shows up first in
          // "Also set" (right below this control), not appended after everything
          // else where they'd have to scroll to find and fill it in.
          setExtraFields((prev) => [
            { side: extraDraftSide, key: extraDraftKey },
            ...prev,
          ]);
          setExtraDraftKey('');
          setAddingExtra(false);
        }}
      >
        <Plus /> Add
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Cancel"
        onClick={() => setAddingExtra(false)}
      >
        <X />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Default values</h3>
          <p className="text-muted-foreground text-xs">
            Every field a connected platform requires needs a default value or a
            skip rule before the sync can run.
          </p>
        </div>
        {requiredItems.length > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'gap-1.5',
              fullyResolved && 'bg-success/10 text-success',
            )}
          >
            {resolvedCount} of {requiredItems.length} resolved
          </Badge>
        )}
      </div>

      {addingExtra ? (
        addExtraControl
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setAddingExtra(true)}
        >
          <Plus /> Add another default value
        </Button>
      )}

      {extraItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Also set
          </p>
          {extraItems.map((i) => renderItem(i, true))}
        </div>
      )}

      {requiredItems.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing required here — every field either has a match or isn't
          required by either platform.
        </p>
      ) : (
        <div className="max-h-[560px] overflow-y-auto pr-1">
          <div
            className={cn(
              'grid grid-cols-1 gap-4',
              showSourceColumn &&
                sourceItems.length > 0 &&
                destItems.length > 0 &&
                'md:grid-cols-2',
            )}
          >
            {showSourceColumn && sourceItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  {PLATFORM_LABEL[sourcePlatform] ?? sourcePlatform} (source)
                </p>
                {sourceItems.map((i) => renderItem(i, false))}
              </div>
            )}

            {destItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  {PLATFORM_LABEL[destPlatform] ?? destPlatform} (destination)
                </p>
                {destItems.map((i) => renderItem(i, false))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
