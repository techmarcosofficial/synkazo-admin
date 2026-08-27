import type {
  FieldDef as CanvasFieldDef,
  MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import RequiredFieldDefaults from '@/components/fieldmapping/RequiredFieldDefaults';
import type { MappingRow } from '@/features/jobs/types';
import type { CanvasField } from '@/features/jobs/utils';

/**
 * Two-way-only wizard step, shown after Field Mapping: every required field
 * (source and destination) needs a default value or a skip rule before the
 * job can be created, since the reverse leg writes into the source platform
 * too. Thin wrapper — all the logic lives in RequiredFieldDefaults, shared
 * with the edit tab's equivalent section.
 */
export default function DefaultValuesStep({
  sourcePlatform,
  destPlatform,
  apiSourceFields,
  apiDestFields,
  customSourceFields,
  customDestFields,
  fieldMappings,
  onMappingsChange,
  onResolvedChange,
  showValidation,
}: {
  sourcePlatform: string;
  destPlatform: string;
  apiSourceFields: CanvasField[];
  apiDestFields: CanvasField[];
  customSourceFields: CanvasField[];
  customDestFields: CanvasField[];
  fieldMappings: MappingRow[];
  onMappingsChange: (mappings: MappingRow[]) => void;
  onResolvedChange?: (resolved: boolean) => void;
  showValidation?: boolean;
}) {
  const sourceFields = [...customSourceFields, ...apiSourceFields];
  const destFields = [...customDestFields, ...apiDestFields];

  return (
    <div className="space-y-3">
      <RequiredFieldDefaults
        sourceFields={sourceFields as unknown as CanvasFieldDef[]}
        destFields={destFields as unknown as CanvasFieldDef[]}
        sourcePlatform={sourcePlatform}
        destPlatform={destPlatform}
        mappings={fieldMappings as unknown as CanvasMappingRow[]}
        onMappingsChange={
          onMappingsChange as unknown as (m: CanvasMappingRow[]) => void
        }
        scope="two_way"
        onResolvedChange={onResolvedChange}
        showValidation={showValidation}
      />
    </div>
  );
}
