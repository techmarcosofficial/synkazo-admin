import DestinationSkipConditionsEditor from './DestinationSkipConditionsEditor';
import ExcludeConditionsEditor from './ExcludeConditionsEditor';
import type { FieldDef } from './FieldMappingCanvas';

import HeadingPair from '@/components/shared/HeadingPair';
import type {
  DestinationSkipCondition,
  ExcludeCondition,
} from '@/types/conditions';

interface Props {
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  sourceConditions: ExcludeCondition[];
  sourceConditionLogic: 'AND' | 'OR';
  destinationConditions: DestinationSkipCondition[];
  onSourceChange: (conditions: ExcludeCondition[], logic: 'AND' | 'OR') => void;
  onDestinationChange: (conditions: DestinationSkipCondition[]) => void;
  searchQuery?: string;
  addRequestSignal?: number;
  showSourceAddButton?: boolean;
  isDirty?: boolean;
  onPreviewSource?: () => void;
  previewingSource?: boolean;
  layout?: 'stacked' | 'grid';
}

export default function SkipRecordEditor({
  sourceFields,
  destinationFields,
  sourceConditions,
  sourceConditionLogic,
  destinationConditions,
  onSourceChange,
  onDestinationChange,
  searchQuery,
  addRequestSignal,
  showSourceAddButton = true,
  isDirty = false,
  onPreviewSource,
  previewingSource = false,
  layout = 'stacked',
}: Props) {
  return (
    <section
      className="border-border bg-card overflow-hidden rounded-4xl border"
      aria-labelledby="skip-record-heading"
    >
      <div className="bg-muted/30 border-b px-4 py-3">
        <HeadingPair
          visualLevel="card"
          level="h3"
          titleId="skip-record-heading"
          title="Skip Record"
          subtitle="Source conditions inspect incoming source data before mapping. Destination conditions run only after an existing destination record is found and can skip that record's update."
          className="max-w-4xl"
        />
      </div>

      <div className="divide-border divide-y">
        <div className="min-w-0">
          <ExcludeConditionsEditor
            sourceFields={sourceFields}
            conditions={sourceConditions}
            conditionLogic={sourceConditionLogic}
            onChange={onSourceChange}
            searchQuery={searchQuery}
            addRequestSignal={addRequestSignal}
            showAddButton={showSourceAddButton}
            isDirty={isDirty}
            onPreview={onPreviewSource}
            previewing={previewingSource}
            layout={layout}
            embedded
          />
        </div>

        <div className="min-w-0">
          <DestinationSkipConditionsEditor
            sourceFields={sourceFields}
            destinationFields={destinationFields}
            conditions={destinationConditions}
            onChange={onDestinationChange}
            embedded
          />
        </div>
      </div>
    </section>
  );
}
