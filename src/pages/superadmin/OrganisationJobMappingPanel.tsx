import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { CrossObjectProperty } from '@/api/jobs';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import CrossObjectPropertiesDialog from '@/components/fieldmapping/CrossObjectPropertiesDialog';
import type { CrossObjectPropertyActions } from '@/components/fieldmapping/CrossObjectPropertiesPanel';
import DefaultValuesDialog from '@/components/fieldmapping/DefaultValuesDialog';
import { validateDestinationSkipConditions } from '@/components/fieldmapping/DestinationSkipConditionsEditor';
import { validateExcludeConditions } from '@/components/fieldmapping/ExcludeConditionsEditor';
import FieldMappingCanvas, { type FieldDef, type MappingRow as CanvasMappingRow } from '@/components/fieldmapping/FieldMappingCanvas';
import { FieldMappingDraftFooter, FieldMappingWorkspaceHeader } from '@/components/fieldmapping/FieldMappingWorkspaceChrome';
import JobFiltersDialog from '@/components/fieldmapping/JobFiltersDialog';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Card, CardContent } from '@/components/ui/card';
import { toFieldMappingPayload } from '@/features/jobs/components/create/mappingPayload';
import { supportsCrossObjectProperties } from '@/components/fieldmapping/supportsCrossObjectProperties';
import type { ConsolidatedMapping } from '@/features/jobs/hooks';
import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';
import type { MappingRow } from '@/features/jobs/types';
import { toCanvasField } from '@/features/jobs/utils';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { recordMatchesExcludeConditions } from '@/lib/excludeConditions';
import { useReplaceSuperAdminJobMappingsMutation, useSuperAdminDiscoveredFieldsQuery, useUpdateSuperAdminJobMutation } from '@/queries/useSuperAdmin';
import type { DestinationSkipCondition, ExcludeCondition } from '@/types/conditions';
import type { SuperAdminFieldMapping, SuperAdminJobDetail, SuperAdminProjectDetail } from '@/types/superAdmin';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fromSavedMappings(saved: SuperAdminFieldMapping[]): CanvasMappingRow[] {
  return saved.map((mapping) => {
    const destField = mapping.destField;
    const rules = mapping.transformConfig?.rules;
    return {
      sourceField: mapping.sourceField,
      destField,
      isRequired: mapping.isRequired,
      transformType: mapping.transformType ?? 'direct',
      transformConfig: mapping.transformConfig,
      destRules: Array.isArray(rules) ? { [destField]: rules } : undefined,
      matchDestKey: mapping.isMatchField ? destField : null,
      matchOrder: mapping.matchPriority,
      direction: mapping.direction as CanvasMappingRow['direction'],
      destOnEmpty: mapping.onEmpty ? { [destField]: mapping.onEmpty as 'none' | 'default' | 'skip_record' } : undefined,
      destDefaults: mapping.defaultValue != null ? { [destField]: mapping.defaultValue } : undefined,
      destReverseOnEmpty: mapping.reverseOnEmpty ? { [destField]: mapping.reverseOnEmpty as 'none' | 'default' | 'skip_record' } : undefined,
      destReverseDefaults: mapping.reverseDefaultValue != null ? { [destField]: mapping.reverseDefaultValue } : undefined,
      destUpdatePolicy: mapping.updatePolicy === 'create_only' ? { [destField]: 'create_only' as const } : undefined,
      destConflictScope: mapping.conflictScope ? { [destField]: mapping.conflictScope } : undefined,
      originalUpdatePolicy: mapping.updatePolicy,
    };
  });
}

interface Props {
  organisationId: string;
  project: SuperAdminProjectDetail;
  job: SuperAdminJobDetail;
}

export default function OrganisationJobMappingPanel({ organisationId, project, job }: Props) {
  const { currentUser } = useSynkazoAuth();
  const draftKey = `super-admin:${currentUser?.id ?? 'unknown'}:${organisationId}:${project.id}:${job.id}`;
  const getDraft = useFieldMappingDraftStore((state) => state.getDraft);
  const saveDraft = useFieldMappingDraftStore((state) => state.saveDraft);
  const clearTabDraft = useFieldMappingDraftStore((state) => state.clearTabDraft);
  const savedRows = useRef(fromSavedMappings(job.fieldMappings ?? []));
  const savedFilters = useRef({
    source: clone(job.excludeConditions ?? []),
    logic: job.excludeConditionLogic ?? 'AND' as const,
    destination: clone(job.destinationSkipConditions ?? []),
  });
  const draft = getDraft(draftKey);
  const [rows, setRows] = useState<CanvasMappingRow[]>(() =>
    draft?.mappingDirty && draft.fieldMappings
      ? clone(draft.fieldMappings as CanvasMappingRow[])
      : clone(savedRows.current),
  );
  const [mappingDirty, setMappingDirty] = useState(Boolean(draft?.mappingDirty));
  const [sourceConditions, setSourceConditions] = useState<ExcludeCondition[]>(() =>
    draft?.conditionsDirty && draft.excludeConditions
      ? clone(draft.excludeConditions)
      : clone(savedFilters.current.source),
  );
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>(() =>
    draft?.conditionsDirty ? draft.excludeConditionLogic ?? savedFilters.current.logic : savedFilters.current.logic,
  );
  const [destinationConditions, setDestinationConditions] = useState<DestinationSkipCondition[]>(() =>
    draft?.conditionsDirty && draft.destinationSkipConditions
      ? clone(draft.destinationSkipConditions)
      : clone(savedFilters.current.destination),
  );
  const [conditionsDirty, setConditionsDirty] = useState(Boolean(draft?.conditionsDirty));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toolbarContainer, setToolbarContainer] = useState<HTMLDivElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewingConditions, setPreviewingConditions] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [crossObjectOpen, setCrossObjectOpen] = useState(false);
  const [crossObjectProperties, setCrossObjectProperties] = useState<CrossObjectProperty[]>([]);
  const [crossObjectError, setCrossObjectError] = useState(false);
  const [defaultValues, setDefaultValues] = useState(job.defaultValues);

  const sourceFields = useSuperAdminDiscoveredFieldsQuery(organisationId, project.id, project.sourcePlatformId, job.sourceObject);
  const destFields = useSuperAdminDiscoveredFieldsQuery(organisationId, project.id, project.destPlatformId, job.destObject);
  const replace = useReplaceSuperAdminJobMappingsMutation(organisationId, project.id, job.id);
  const updateJob = useUpdateSuperAdminJobMutation(organisationId, project.id, job.id);
  const hasCrossObject = supportsCrossObjectProperties(project.sourcePlatformId);
  const crossObjectActions = useMemo<CrossObjectPropertyActions>(() => ({
    loadOptions: () => superAdminOperationsApi.getJobCrossObjectOptions(organisationId, project.id, job.id),
    loadRelatedFields: (relatedObject) => superAdminOperationsApi.discoverFields(organisationId, project.id, project.sourcePlatformId, relatedObject).then((fields) => fields.map(toCanvasField)),
    create: (data) => superAdminOperationsApi.createJobCrossObjectProperty(organisationId, project.id, job.id, data),
    remove: (propertyId) => superAdminOperationsApi.removeJobCrossObjectProperty(organisationId, project.id, job.id, propertyId),
  }), [organisationId, project.id, project.sourcePlatformId, job.id]);

  useEffect(() => {
    if (!hasCrossObject) return;
    let active = true;
    superAdminOperationsApi.listJobCrossObjectProperties(organisationId, project.id, job.id)
      .then((properties) => { if (active) { setCrossObjectProperties(properties); setCrossObjectError(false); } })
      .catch(() => { if (active) setCrossObjectError(true); });
    return () => { active = false; };
  }, [organisationId, project.id, job.id, hasCrossObject, crossObjectOpen]);

  const dirty = mappingDirty || conditionsDirty;
  useEffect(() => {
    if (!dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [dirty]);

  const mappedSourceKeys = [...new Set(rows.map((row) => row.sourceField).filter(Boolean))];
  const mappedDestinationKeys = [...new Set(rows.flatMap((row) => Array.isArray(row.destField) ? row.destField : [row.destField]).filter(Boolean))];
  const sourceCanvasFields = sourceFields.data?.map(toCanvasField) ?? [];
  const destCanvasFields = destFields.data?.map(toCanvasField) ?? [];
  const effectiveSourceFields = [
    ...sourceCanvasFields,
    ...crossObjectProperties.map((property) => ({
      key: property.sourceFieldKey,
      label: property.displayLabel,
      type: 'string',
      required: false,
      isCustom: false,
      readOnly: false,
      crossObject: true,
    })),
  ];
  const defaultValuesCount = Object.keys(defaultValues?.destination ?? {}).length +
    (job.syncDirection === 'two_way' ? Object.keys(defaultValues?.source ?? {}).length : 0);

  const changeRows = (next: CanvasMappingRow[]) => {
    setRows(next);
    setMappingDirty(true);
    setSaved(false);
    setError(null);
    saveDraft(draftKey, { fieldMappings: clone(next) as unknown as ConsolidatedMapping[], mappingDirty: true });
  };
  const changeSourceConditions = (conditions: ExcludeCondition[], logic: 'AND' | 'OR') => {
    setSourceConditions(conditions);
    setConditionLogic(logic);
    setConditionsDirty(true);
    setSaved(false);
    setError(null);
    saveDraft(draftKey, { excludeConditions: clone(conditions), excludeConditionLogic: logic, conditionsDirty: true });
  };
  const changeDestinationConditions = (conditions: DestinationSkipCondition[]) => {
    setDestinationConditions(conditions);
    setConditionsDirty(true);
    setSaved(false);
    setError(null);
    saveDraft(draftKey, { destinationSkipConditions: clone(conditions), conditionsDirty: true });
  };

  const previewConditions = async () => {
    const validationError = validateExcludeConditions(sourceConditions);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    if (sourceConditions.length === 0) {
      toast.info('Add a condition before previewing matches.');
      return;
    }

    setPreviewingConditions(true);
    try {
      const sample = await superAdminOperationsApi.getJobFilterSample(organisationId, project.id, job.id);
      if (!sample) {
        toast.info('No previously synced source record is available to preview.');
        return;
      }
      const matches = recordMatchesExcludeConditions(sample, sourceConditions, conditionLogic);
      if (matches) {
        toast.success('Sample preview: this record would be skipped.');
      } else {
        toast.info('Sample preview: this record would continue to field mapping.');
      }
    } catch (failure) {
      const response = failure as { response?: { data?: { message?: string } } };
      toast.error(response.response?.data?.message ?? 'Could not load a source record for preview.');
    } finally {
      setPreviewingConditions(false);
    }
  };

  const save = async () => {
    if (!dirty || saving) return;
    const validationError = validateExcludeConditions(sourceConditions) ?? validateDestinationSkipConditions(destinationConditions);
    if (conditionsDirty && validationError) { setError(validationError); return; }
    setSaving(true);
    setError(null);
    try {
      if (mappingDirty) {
        const payload = toFieldMappingPayload(rows as MappingRow[], job.syncDirection);
        if (payload.length < 2 || !payload.some((mapping) => mapping.isMatchField)) {
          setError('Map at least two fields and mark a unique identifier with the key icon.');
          return;
        }
        const existing = new Map((job.fieldMappings ?? []).map((mapping) => [`${mapping.sourceField}\u0000${mapping.destField}`, mapping]));
        const safePayload = payload.map((mapping) => {
          const previous = existing.get(`${mapping.sourceField}\u0000${mapping.destField}`);
          return {
            ...mapping,
            updatePolicy: previous?.updatePolicy === 'fill_if_empty' && mapping.updatePolicy === 'always'
              ? 'fill_if_empty' as const
              : mapping.updatePolicy,
            isRequired: previous?.isRequired ?? mapping.isRequired,
          };
        });
        const updated = await replace.mutateAsync(safePayload);
        const restored = fromSavedMappings(updated);
        savedRows.current = clone(restored);
        setRows(restored);
        setMappingDirty(false);
        clearTabDraft(draftKey, 'field-mapping');
      }
      if (conditionsDirty) {
        await updateJob.mutateAsync({
          excludeConditions: sourceConditions.length ? sourceConditions : null,
          excludeConditionLogic: conditionLogic,
          destinationSkipConditions: destinationConditions.length ? destinationConditions : null,
        });
        savedFilters.current = {
          source: clone(sourceConditions),
          logic: conditionLogic,
          destination: clone(destinationConditions),
        };
        setConditionsDirty(false);
        clearTabDraft(draftKey, 'skip-record');
      }
      setSaved(true);
      toast.success('Field mapping changes saved.');
    } catch (failure) {
      const response = failure as { response?: { data?: { message?: string | string[] } } };
      const message = response.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message ?? 'Could not save field mapping changes.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setRows(clone(savedRows.current));
    setSourceConditions(clone(savedFilters.current.source));
    setConditionLogic(savedFilters.current.logic);
    setDestinationConditions(clone(savedFilters.current.destination));
    setMappingDirty(false);
    setConditionsDirty(false);
    setError(null);
    setSaved(false);
    clearTabDraft(draftKey, 'field-mapping');
    clearTabDraft(draftKey, 'skip-record');
    toast.info('Changes discarded.');
  };

  if (sourceFields.isLoading || destFields.isLoading) return <SkeletonList count={3} />;
  if (sourceFields.isError || destFields.isError || !sourceFields.data || !destFields.data) {
    return <ErrorState title="Could not discover job fields" onRetry={() => { sourceFields.refetch(); destFields.refetch(); }} />;
  }

  return <div className={dirty ? 'space-y-4 pb-8' : 'space-y-4'}>
    {job.isEnabled && dirty && <div className="bg-warning/10 flex items-start gap-3 rounded-4xl px-4 py-3"><AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" /><p className="text-warning text-sm">You are changing the mapping of an active sync job. These changes will only apply to future syncs.</p></div>}
    <Card className="border-border bg-card gap-0 py-0 shadow-xs"><CardContent className="p-0">
      <FieldMappingWorkspaceHeader
        mappedCount={rows.length}
        dirty={dirty}
        filtersCount={sourceConditions.length + destinationConditions.length}
        defaultsCount={defaultValuesCount}
        crossObjectCount={crossObjectProperties.length}
        showCrossObject={hasCrossObject}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenDefaults={() => setDefaultsOpen(true)}
        onOpenCrossObject={() => setCrossObjectOpen(true)}
        setToolbarContainer={setToolbarContainer}
      />
      <div className="space-y-4 p-5">
        {crossObjectError && <p role="alert" className="text-destructive text-xs">Cross-object properties could not be loaded. Open Cross-Object to retry.</p>}
        <FieldMappingCanvas
          sourceFields={effectiveSourceFields as unknown as FieldDef[]}
          destFields={destCanvasFields as unknown as FieldDef[]}
          mappings={rows}
          onMappingsChange={changeRows}
          excludeConditions={sourceConditions}
          onExcludeConditionsChange={(conditions) => changeSourceConditions(conditions, conditionLogic)}
          sourcePlatform={project.sourcePlatformId}
          destPlatform={project.destPlatformId}
          sourceObject={job.sourceObject}
          destObject={job.destObject}
          onRefreshFields={() => { sourceFields.refetch(); destFields.refetch(); }}
          showDirectionToggle={job.syncDirection === 'two_way'}
          showHeading={false}
          toolbarContainer={toolbarContainer}
          onAddSourceField={null}
          onAddDestField={null}
          isFirstTime={!savedRows.current.length}
          isDirty={mappingDirty}
        />
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      </div>
    </CardContent></Card>
    <FieldMappingDraftFooter dirty={dirty} saving={saving} saved={saved} onDiscard={discard} onSave={() => void save()} />
    <DefaultValuesDialog
      open={defaultsOpen}
      onOpenChange={setDefaultsOpen}
      projectId={project.id}
      job={{ ...job, defaultValues }}
      sourceFields={sourceCanvasFields as unknown as FieldDef[]}
      destinationFields={destCanvasFields as unknown as FieldDef[]}
      sourcePlatform={project.sourcePlatformId}
      destinationPlatform={project.destPlatformId}
      mappedSourceKeys={mappedSourceKeys}
      mappedDestinationKeys={mappedDestinationKeys}
      mappings={rows}
      saveDefaults={(defaults) => updateJob.mutateAsync({ defaultValues: defaults })}
      onSaved={(updated) => setDefaultValues(updated.defaultValues ?? null)}
    />
    <JobFiltersDialog
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      sourceFields={effectiveSourceFields as unknown as FieldDef[]}
      destinationFields={destCanvasFields as unknown as FieldDef[]}
      sourceConditions={sourceConditions}
      sourceConditionLogic={conditionLogic}
      destinationConditions={destinationConditions}
      onSourceChange={changeSourceConditions}
      onDestinationChange={changeDestinationConditions}
      onPreviewSource={() => void previewConditions()}
      previewingSource={previewingConditions}
      error={conditionsDirty ? error ?? validateExcludeConditions(sourceConditions) ?? validateDestinationSkipConditions(destinationConditions) : null}
      mappedSourceKeys={mappedSourceKeys}
      mappedDestinationKeys={mappedDestinationKeys}
    />
    {hasCrossObject && <CrossObjectPropertiesDialog
      open={crossObjectOpen}
      onOpenChange={setCrossObjectOpen}
      projectId={project.id}
      jobId={job.id}
      platformId={project.sourcePlatformId}
      sourceObject={job.sourceObject}
      sourceFields={sourceCanvasFields as unknown as FieldDef[]}
      properties={crossObjectProperties}
      onPropertiesChange={(properties) => { setCrossObjectProperties(properties); setCrossObjectError(false); }}
      actions={crossObjectActions}
    />}
  </div>;
}
