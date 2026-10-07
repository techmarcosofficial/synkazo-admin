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
  mappedSourceKeys?: string[];
  mappedDestinationKeys?: string[];
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
  activeSection?: 'all' | 'source' | 'destination';
}

export default function SkipRecordEditor({
  sourceFields,
  destinationFields,
  mappedSourceKeys,
  mappedDestinationKeys,
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
  activeSection = 'all',
}: Props) {
  const showSource = activeSection === 'all' || activeSection === 'source';
  const showDestination =
    activeSection === 'all' || activeSection === 'destination';

  return (
    <section className="space-y-6" aria-labelledby="skip-record-heading">
      <div className="sr-only">
        <HeadingPair
          visualLevel="section"
          level="h3"
          titleId="skip-record-heading"
          title="Skip Record"
          subtitle="Source conditions inspect incoming source data before mapping. Destination conditions run only after an existing destination record is found and can skip that record's update."
        />
      </div>

      <div className="space-y-6">
        {showSource && (
          <ExcludeConditionsEditor
            sourceFields={sourceFields}
            mappedFieldKeys={mappedSourceKeys}
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
        )}

        {showSource && showDestination && (
          <div className="border-border/80 my-2 border-t" />
        )}

        {showDestination && (
          <DestinationSkipConditionsEditor
            sourceFields={sourceFields}
            destinationFields={destinationFields}
            mappedSourceKeys={mappedSourceKeys}
            mappedDestinationKeys={mappedDestinationKeys}
            conditions={destinationConditions}
            onChange={onDestinationChange}
            embedded
          />
        )}
      </div>
    </section>
  );
}
