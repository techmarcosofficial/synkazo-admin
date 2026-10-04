import {
  AlertCircleIcon,
  CheckCircle2,
  Key,
  Link2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useMemo } from 'react';

import SkipRecordEditor from '@/components/fieldmapping/SkipRecordEditor';
import FieldMappingCanvas, {
  type FieldDef as CanvasFieldDef,
  type MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { MappingRow } from '@/features/jobs/types';
import type { CanvasField } from '@/features/jobs/utils';
import type {
  DestinationSkipCondition,
  ExcludeCondition,
} from '@/types/conditions';

export default function FieldMappingStep({
  sourcePlatform,
  destPlatform,
  sourceObjectLabel,
  destObjectLabel,
  apiSourceFields,
  apiDestFields,
  customSourceFields,
  customDestFields,
  onRemoveCustomSourceField,
  onRemoveCustomDestField,
  fieldsLoading,
  fieldsError,
  fieldMappings,
  onMappingsChange,
  onRefreshFields,
  onAddSourceField,
  onAddDestField,
  addFieldLocked,
  projectId,
  showDirectionToggle = false,
  onAttentionReviewChange,
  scrollToAttentionSignal,
  excludeConditions,
  excludeConditionLogic,
  onExcludeConditionsChange,
  destinationSkipConditions,
  onDestinationSkipConditionsChange,
  skipUpdateOnMatch,
  onSkipUpdateOnMatchChange,
}: {
  sourcePlatform: string;
  destPlatform: string;
  sourceObjectLabel: string;
  destObjectLabel: string;
  apiSourceFields: CanvasField[];
  apiDestFields: CanvasField[];
  customSourceFields: CanvasField[];
  customDestFields: CanvasField[];
  onRemoveCustomSourceField: (key: string) => void;
  onRemoveCustomDestField: (key: string) => void;
  fieldsLoading: boolean;
  fieldsError: string | null;
  fieldMappings: MappingRow[];
  onMappingsChange: (mappings: MappingRow[]) => void;
  onRefreshFields: () => void;
  onAddSourceField?: (() => void) | null;
  onAddDestField?: (() => void) | null;
  addFieldLocked?: boolean;
  projectId: string;
  showDirectionToggle?: boolean;
  onAttentionReviewChange?: (info: {
    count: number;
    reviewed: boolean;
  }) => void;
  scrollToAttentionSignal?: number;
  excludeConditions: ExcludeCondition[];
  excludeConditionLogic: 'AND' | 'OR';
  onExcludeConditionsChange: (
    conditions: ExcludeCondition[],
    logic: 'AND' | 'OR',
  ) => void;
  destinationSkipConditions: DestinationSkipCondition[];
  onDestinationSkipConditionsChange: (
    conditions: DestinationSkipCondition[],
  ) => void;
  skipUpdateOnMatch: boolean;
  onSkipUpdateOnMatchChange: (value: boolean) => void;
}) {
  const sourceFields = [...customSourceFields, ...apiSourceFields];
  const destFields = [...customDestFields, ...apiDestFields];

  const mappedSourceKeys = useMemo(
    () =>
      Array.from(
        new Set(
          fieldMappings
            .map((mapping) => mapping.sourceField)
            .filter((field): field is string => Boolean(field)),
        ),
      ),
    [fieldMappings],
  );

  const mappedDestinationKeys = useMemo(
    () =>
      Array.from(
        new Set(
          fieldMappings
            .flatMap((mapping) =>
              Array.isArray(mapping.destField)
                ? mapping.destField
                : [mapping.destField],
            )
            .filter((field): field is string => Boolean(field)),
        ),
      ),
    [fieldMappings],
  );

  return (
    <div className="space-y-3">
      {fieldsLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-3 py-20">
          <Spinner />
          <span className="text-sm">
            Loading fields from connected accounts…
          </span>
        </div>
      ) : fieldsError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>
            {fieldsError}
            {(apiSourceFields.length > 0 || apiDestFields.length > 0) && (
              <span className="block">
                Partial fields loaded — you can still continue.
              </span>
            )}
            <button
              onClick={onRefreshFields}
              className="text-primary mt-1 inline-flex items-center gap-1 underline hover:no-underline"
            >
              <RefreshCw className="size-3" /> Retry with fresh fetch
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {(sourceFields.length === 0 || destFields.length === 0) && (
            <Alert>
              <AlertCircleIcon />
              <AlertDescription>
                {sourceFields.length === 0 && destFields.length === 0
                  ? `No fields discovered for either object.`
                  : sourceFields.length === 0
                    ? `No fields discovered for source object.`
                    : `No fields discovered for destination object.`}
                <button
                  onClick={onRefreshFields}
                  className="ml-2 underline hover:no-underline"
                >
                  Refresh
                </button>
              </AlertDescription>
            </Alert>
          )}
          {(() => {
            const hasMatchField = fieldMappings.some(
              (m) => Boolean(m.isMatchField || m.matchDestKey),
            );
            return (
              <div className="rounded-3xl border border-info/30 bg-info/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                    {hasMatchField ? (
                      <CheckCircle2 className="text-success size-3.5" />
                    ) : (
                      <Key className="size-3.5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-foreground text-sm font-semibold">
                        How should we identify matching records? (Unique Identifier)
                      </h4>
                      {hasMatchField ? (
                        <Badge
                          variant="secondary"
                          className="border-success/20 bg-success/10 text-success text-[10px]"
                        >
                          Identifier Configured
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="border-warning/20 bg-warning/10 text-warning text-[10px]"
                        >
                          Required Before Next Step
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      To prevent duplicate records from being created in your destination platform,
                      choose at least one field that uniquely identifies each record (such as Email, Phone, or ID).
                      Click the <strong>key icon</strong> next to the primary matching field in the canvas below.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
          <FieldMappingCanvas
            sourceFields={sourceFields as unknown as CanvasFieldDef[]}
            destFields={destFields as unknown as CanvasFieldDef[]}
            mappings={fieldMappings as unknown as CanvasMappingRow[]}
            onMappingsChange={
              onMappingsChange as unknown as (
                mappings: CanvasMappingRow[],
              ) => void
            }
            onAddSourceField={onAddSourceField ?? null}
            onAddDestField={onAddDestField ?? null}
            addFieldLocked={addFieldLocked}
            autoMapOnLoad
            sourcePlatform={sourcePlatform}
            destPlatform={destPlatform}
            sourceObject={sourceObjectLabel}
            destObject={destObjectLabel}
            onRefreshFields={onRefreshFields}
            projectId={projectId}
            fieldsLoading={fieldsLoading}
            showDirectionToggle={showDirectionToggle}
            onAttentionReviewChange={onAttentionReviewChange}
            scrollToAttentionSignal={scrollToAttentionSignal}
          />
        </>
      )}

      {(customSourceFields.length > 0 || customDestFields.length > 0) && (
        <div className="bg-muted/40 rounded-4xl border p-4">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Custom Fields Added
          </p>
          <div className="flex flex-wrap gap-2">
            {customSourceFields.map((f) => (
              <Badge key={f.key} className="bg-primary/10 text-primary gap-1">
                Source: {f.label}
                <Button
                  onClick={() => onRemoveCustomSourceField(f.key)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-2.5" />
                </Button>
              </Badge>
            ))}
            {customDestFields.map((f) => (
              <Badge key={f.key} className="bg-paused/10 text-paused gap-1">
                Dest: {f.label}
                <Button
                  onClick={() => onRemoveCustomDestField(f.key)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-2.5" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <SkipRecordEditor
        sourceFields={sourceFields as unknown as CanvasFieldDef[]}
        destinationFields={destFields as unknown as CanvasFieldDef[]}
        sourceConditions={excludeConditions}
        sourceConditionLogic={excludeConditionLogic}
        destinationConditions={destinationSkipConditions}
        onSourceChange={onExcludeConditionsChange}
        onDestinationChange={onDestinationSkipConditionsChange}
        mappedSourceKeys={mappedSourceKeys}
        mappedDestinationKeys={mappedDestinationKeys}
      />

      <Card>
        <CardContent>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="wizard-skip-update-on-match">
                Never update matched records
              </FieldLabel>
              <p className="text-muted-foreground text-xs">
                When a record already exists in the destination, leave it
                completely untouched instead of updating it — only brand-new
                records get written.
              </p>
            </FieldContent>
            <Switch
              id="wizard-skip-update-on-match"
              checked={skipUpdateOnMatch}
              onCheckedChange={onSkipUpdateOnMatchChange}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="border-border/60 bg-muted/40 flex flex-col gap-3 rounded-2xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
            <Link2 className="size-4" />
          </div>
          <div>
            <p className="text-foreground font-semibold">
              Linking Related Records (e.g. Contacts to Companies)
            </p>
            <p className="text-muted-foreground text-xs">
              Field mapping synchronizes record attributes. To associate records across platforms, configure Record Associations in Project Settings once your flows are set up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
