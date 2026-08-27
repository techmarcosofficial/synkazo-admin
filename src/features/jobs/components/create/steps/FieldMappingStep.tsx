import { AlertCircleIcon, RefreshCw, X } from 'lucide-react';

import FieldMappingCanvas, {
  type FieldDef as CanvasFieldDef,
  type MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { MappingRow } from '@/features/jobs/types';
import type { CanvasField } from '@/features/jobs/utils';

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
}) {
  const sourceFields = [...customSourceFields, ...apiSourceFields];
  const destFields = [...customDestFields, ...apiDestFields];

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
        <div className="bg-muted/40 rounded-xl p-4">
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
    </div>
  );
}
