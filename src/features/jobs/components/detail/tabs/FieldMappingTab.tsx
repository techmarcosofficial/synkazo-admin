import {
  AlertTriangle,
  Check,
  ListFilter,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { associationsApi } from '@/api/associations';
import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import ExcludeConditionsEditor, {
  validateExcludeConditions,
} from '@/components/fieldmapping/ExcludeConditionsEditor';
import { isValidDefaultValue } from '@/components/fieldmapping/EmptyValuePolicy';
import FieldMappingCanvas, {
  type FieldDef as CanvasFieldDef,
  type MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import RequiredFieldDefaults from '@/components/fieldmapping/RequiredFieldDefaults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  consolidateMappings,
  type ConsolidatedMapping,
} from '@/features/jobs/hooks';
import {
  fmtObject,
  toCanvasField,
  type CanvasField,
} from '@/features/jobs/utils';
import { recordMatchesExcludeConditions } from '@/lib/excludeConditions';
import { classifyTypePair } from '@/lib/fieldMatching';
import { getRequiredFieldItems } from '@/lib/requiredFields';
import type { Connection, FieldMapping } from '@/types';
import type { ExcludeCondition } from '@/types/conditions';

type ExtConnection = Connection & { connectionType?: string };

function normalizeMappings(
  mappings: ConsolidatedMapping[] | undefined | null,
  syncDirection?: string,
) {
  return (mappings || []).flatMap((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.map((dk) => ({
      sourceField: m.sourceField,
      destField: dk,
      transformType: 'direct',
      transformConfig: m.destRules?.[dk]
        ? { rules: m.destRules[dk] }
        : (m.transformConfig ?? null),
      isRequired: m.isRequired ?? false,
      isMatchField: m.matchDestKey === dk,
      matchPriority: m.matchDestKey === dk ? (m.matchOrder ?? null) : null,
      updatePolicy: m.destUpdatePolicy?.[dk] ?? 'always',
      conflictScope: m.destConflictScope?.[dk] ?? 'field',
      onEmpty: m.destOnEmpty?.[dk] ?? 'none',
      defaultValue: m.destDefaults?.[dk] ?? null,
      reverseOnEmpty: m.destReverseOnEmpty?.[dk] ?? 'none',
      reverseDefaultValue: m.destReverseDefaults?.[dk] ?? null,
      direction:
        m.direction ??
        (syncDirection === 'two_way' ? 'bidirectional' : undefined),
    }));
  });
}

/** A constant mapping — one side deliberately empty (see the FieldMapping entity). */
const isConstant = (m: { sourceField: string; destField: string }) =>
  !m.sourceField || !m.destField;

const cloneMappings = (mappings: ConsolidatedMapping[]) =>
  JSON.parse(JSON.stringify(mappings)) as ConsolidatedMapping[];

const cloneConditions = (conditions: ExcludeCondition[]) =>
  JSON.parse(JSON.stringify(conditions)) as ExcludeCondition[];

export type MappingWorkspaceTab =
  | 'field-mapping'
  | 'default-mapping'
  | 'skip-record';

export function getWorkspaceDirtyState(
  activeWorkspaceTab: MappingWorkspaceTab,
  {
    mappingDirty,
    defaultsDirty,
    conditionsDirty,
  }: {
    mappingDirty: boolean;
    defaultsDirty: boolean;
    conditionsDirty: boolean;
  },
) {
  const anyDirty = mappingDirty || defaultsDirty || conditionsDirty;
  const activeDirty =
    activeWorkspaceTab === 'field-mapping'
      ? mappingDirty
      : activeWorkspaceTab === 'default-mapping'
        ? defaultsDirty
        : conditionsDirty;

  return { anyDirty, activeDirty };
}

const DEFAULT_CONFIG_KEYS = [
  'destOnEmpty',
  'destDefaults',
  'destReverseOnEmpty',
  'destReverseDefaults',
] as const;

const isConstantMapping = (mapping: ConsolidatedMapping) => {
  const destinations = Array.isArray(mapping.destField)
    ? mapping.destField
    : [mapping.destField];
  return !mapping.sourceField || destinations.every((field) => !field);
};

/** Applies only default-value configuration to a structural mapping snapshot.
 * This keeps the mapping and defaults tabs independently saveable even though
 * the API stores both concerns in the same field-mapping resource. */
export const mergeDefaultConfiguration = (
  structure: ConsolidatedMapping[],
  defaults: ConsolidatedMapping[],
) => {
  const defaultRows = new Map(
    defaults
      .filter((mapping) => !isConstantMapping(mapping))
      .map((mapping) => [mapping.sourceField, mapping]),
  );

  const merged = structure
    .filter((mapping) => !isConstantMapping(mapping))
    .map((mapping) => {
      const next = cloneMappings([mapping])[0];
      const defaultRow = defaultRows.get(mapping.sourceField);
      const destinations = new Set(
        Array.isArray(mapping.destField)
          ? mapping.destField
          : [mapping.destField],
      );

      for (const key of DEFAULT_CONFIG_KEYS) {
        const config = defaultRow?.[key] as Record<string, string> | undefined;
        const entries = Object.entries(config ?? {}).filter(([field]) =>
          destinations.has(field),
        );
        if (entries.length > 0) {
          (next as unknown as Record<string, unknown>)[key] =
            Object.fromEntries(entries);
        } else {
          delete (next as unknown as Record<string, unknown>)[key];
        }
      }
      return next;
    });

  return [...merged, ...cloneMappings(defaults.filter(isConstantMapping))];
};

export default function FieldMappingTab() {
  const { projectId, job, refetch, patchJob } = useJobDetailContext();
  const { state: sidebarState } = useSidebar();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<MappingWorkspaceTab>('field-mapping');
  const [mappingToolbarContainer, setMappingToolbarContainer] =
    useState<HTMLDivElement | null>(null);
  const [defaultSearch, setDefaultSearch] = useState('');
  const [showOnlyUnresolvedDefaults, setShowOnlyUnresolvedDefaults] =
    useState(false);
  const [defaultAddRequest, setDefaultAddRequest] = useState(0);
  const [conditionSearch, setConditionSearch] = useState('');
  const [conditionAddRequest, setConditionAddRequest] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<ConsolidatedMapping[]>([]);
  const [defaultMappings, setDefaultMappings] = useState<ConsolidatedMapping[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mappingDirty, setMappingDirty] = useState(false);
  const [defaultsDirty, setDefaultsDirty] = useState(false);
  const savedMappingsRef = useRef<ConsolidatedMapping[]>([]);
  // Exclude conditions live on the Job resource (PATCH /jobs/:id), a completely
  // separate API call from the field-mappings PUT — kept in their own dirty flag
  // so the shared Save button below can fire both calls when either changed.
  const [excludeConditions, setExcludeConditions] = useState<
    ExcludeCondition[]
  >(job.excludeConditions ?? []);
  const [excludeConditionLogic, setExcludeConditionLogic] = useState<
    'AND' | 'OR'
  >(job.excludeConditionLogic ?? 'AND');
  const [conditionsDirty, setConditionsDirty] = useState(false);
  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [previewingConditions, setPreviewingConditions] = useState(false);
  const savedConditionsRef = useRef<{
    conditions: ExcludeCondition[];
    logic: 'AND' | 'OR';
  }>({ conditions: [], logic: 'AND' });
  // Turns a blank "Use a default value" input red once a save was actually
  // attempted and blocked on it — see the missingValue check in
  // persistMappings and RequiredFieldDefaults' forceShowInvalid wiring.
  const [showDefaultsValidation, setShowDefaultsValidation] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(true);
  /**
   * "edit" = mappings loaded from the DB are still present — direction is locked to
   * protect an already-configured/running job. "fresh-setup" = the user has cleared
   * every mapping down to zero at least once, so anything mapped from here on
   * (Auto Map or manual Add Mapping) is treated like first-time setup and direction
   * becomes editable again, same as job creation.
   */
  const [mappingMode, setMappingMode] = useState<'edit' | 'fresh-setup'>(
    'edit',
  );
  // sourceFields already persisted to the DB as of the last load/save — direction is
  // locked for these unless mappingMode flips to "fresh-setup". Anything mapped that
  // isn't in this set (a manually added or auto-mapped field this session) is brand
  // new and gets an editable direction regardless of mode.
  const persistedSourceFieldsRef = useRef<Set<string>>(new Set());
  const [sourceFields, setSourceFields] = useState<CanvasField[]>([]);
  const [destFields, setDestFields] = useState<CanvasField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [srcPlatform, setSrcPlatform] = useState('servicetitan');
  const [dstPlatform, setDstPlatform] = useState('hubspot');

  const loadFields = useCallback(
    (refresh = false) => {
      if (!job.sourceObject || !job.destObject) return;
      setFieldsLoading(true);
      connectionsApi
        .listProjectConnections(projectId)
        .catch(() => [] as ExtConnection[])
        .then((conns: ExtConnection[]) => {
          const src =
            conns.find((c) => c.connectionType === 'source')?.platformId ||
            'servicetitan';
          const dst =
            conns.find((c) => c.connectionType === 'destination')?.platformId ||
            'hubspot';
          setSrcPlatform(src);
          setDstPlatform(dst);
          return Promise.all([
            connectionsApi
              .getProperties(projectId, src, job.sourceObject, { refresh })
              .catch(() => []),
            connectionsApi
              .getProperties(projectId, dst, job.destObject, { refresh })
              .catch(() => []),
          ]);
        })
        .then(([srcProps, dstProps]) => {
          setSourceFields(srcProps.map(toCanvasField));
          setDestFields(dstProps.map(toCanvasField));
        })
        .finally(() => setFieldsLoading(false));
    },
    [projectId, job.sourceObject, job.destObject],
  );

  useEffect(() => {
    const conditions = cloneConditions(job.excludeConditions ?? []);
    const logic = job.excludeConditionLogic ?? 'AND';
    setExcludeConditions(conditions);
    setExcludeConditionLogic(logic);
    savedConditionsRef.current = {
      conditions: cloneConditions(conditions),
      logic,
    };
    setConditionsDirty(false);
    setConditionsError(null);
  }, [job.id]);

  useEffect(() => {
    jobsApi
      .listFieldMappings(projectId, job.id)
      .then((rows) => {
        const consolidated = consolidateMappings(rows);
        setFieldMappings(consolidated);
        setDefaultMappings(cloneMappings(consolidated));
        savedMappingsRef.current = cloneMappings(consolidated);
        persistedSourceFieldsRef.current = new Set(
          consolidated.map((m) => m.sourceField),
        );
        // Nothing existed to protect — treat as fresh setup from the start.
        if (consolidated.length === 0) setMappingMode('fresh-setup');
      })
      .catch(() => {})
      .finally(() => setLoadingMappings(false));
  }, [job.id, projectId]);

  useEffect(() => {
    loadFields(false);
  }, [loadFields]);

  useEffect(() => {
    const hasUnsavedChanges = mappingDirty || defaultsDirty || conditionsDirty;
    if (!hasUnsavedChanges) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const confirmInAppNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const navigationTarget = target.closest('a[href], [role="tab"]');
      if (
        !navigationTarget ||
        workspaceRef.current?.contains(navigationTarget)
      ) {
        return;
      }
      if (
        window.confirm(
          'You have unsaved changes in Field Mapping. Leave this page without saving them?',
        )
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('beforeunload', preventUnload);
    document.addEventListener('click', confirmInAppNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', preventUnload);
      document.removeEventListener('click', confirmInAppNavigation, true);
    };
  }, [mappingDirty, defaultsDirty, conditionsDirty]);

  const isActive = job.isEnabled;

  const handleMappingsChange = (newMappings: ConsolidatedMapping[]) => {
    setFieldMappings(newMappings);
    // Keep the defaults tab on the same current structure. Auto Mapping and
    // manual mapping edits otherwise leave it holding the previous snapshot,
    // so its first policy change can be saved as a constant-only payload.
    setDefaultMappings((currentDefaults) =>
      mergeDefaultConfiguration(newMappings, currentDefaults),
    );
    setMappingDirty(true);
    setSaved(false);
    // Cleared everything (via "Clear all" or deleting the last row one by one) —
    // whatever gets mapped next (Auto Map or manual Add Mapping) is a fresh setup.
    if (newMappings.length === 0) setMappingMode('fresh-setup');
  };

  const handleDefaultsChange = (newMappings: ConsolidatedMapping[]) => {
    setDefaultMappings(newMappings);
    // Default policies are metadata on the current mapping draft, not a
    // separate structure. Reflect them in the mapping tab without marking a
    // structural mapping edit dirty.
    setFieldMappings((currentMappings) =>
      mergeDefaultConfiguration(currentMappings, newMappings),
    );
    setDefaultsDirty(true);
    setSaved(false);
  };

  // Takes the mapping set to persist explicitly, rather than reading `fieldMappings`
  // from closure — RequiredFieldDefaults' Save calls this immediately after handing
  // back a freshly-merged array, before that array has necessarily landed in state.
  const persistMappings = async (
    toSave: ConsolidatedMapping[],
    successMessage: string,
  ): Promise<boolean> => {
    const normalized = normalizeMappings(toSave, job.syncDirection);
    // Constants aren't field-to-field mappings, so they satisfy neither the
    // minimum-mappings rule nor the match-field rule.
    const pairs = normalized.filter((m) => !isConstant(m));
    if (pairs.length < 2) {
      toast.error('At least 2 field mappings are required before saving.');
      return false;
    }
    if (!pairs.some((m) => m.isMatchField)) {
      toast.error(
        'At least one Match Field is required — toggle the switch on a mapping to set it.',
      );
      return false;
    }
    // An enum destination silently discards any value outside its option list, so
    // saving a string→enum pair with no Map Values rule would look fine and sync
    // nothing. Dismissing the warning on the canvas clears the row from here too.
    const unmappedEnums = toSave.flatMap((m) => {
      if (m.dismissed) return [];
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      const sourceType = sourceFields.find(
        (f) => f.key === m.sourceField,
      )?.type;
      return dests.filter((dk) => {
        const df = destFields.find((f) => f.key === dk);
        if (classifyTypePair(sourceType, df?.type) !== 'value_map')
          return false;
        const rules = (m.destRules?.[dk] ?? []) as { type: string }[];
        return !rules.some((r) => r.type === 'value_map');
      });
    });
    if (unmappedEnums.length > 0) {
      toast.error(
        `These fields only accept a fixed list of values and need a Map Values rule: ${unmappedEnums.join(', ')}`,
      );
      return false;
    }
    // Checks both onEmpty/defaultValue (the dest-required, forward-leg policy)
    // and reverseOnEmpty/reverseDefaultValue (the source-required, write-back
    // policy on the same row) — a blank value on either one previously slipped
    // through unchecked here even though it's stored and would silently sync
    // an empty string through.
    const missingValue = normalized.filter(
      (m) =>
        (m.onEmpty === 'default' && !m.defaultValue) ||
        (m.reverseOnEmpty === 'default' && !m.reverseDefaultValue),
    );
    if (missingValue.length > 0) {
      setShowDefaultsValidation(true);
      setActiveWorkspaceTab('default-mapping');
      toast.error(
        `Set a default value for: ${missingValue
          .map((m) => m.destField || m.sourceField)
          .join(', ')}`,
      );
      return false;
    }
    // Two-way jobs write into the source platform too, where an empty required
    // field is rejected outright — so every mapping onto one has to say what
    // happens when it's empty. The API enforces the same rule (see
    // assertRequiredFieldsMapped); this just reports it before the round trip.
    if (job.syncDirection === 'two_way') {
      const unresolved = getRequiredFieldItems(
        sourceFields,
        destFields,
        toSave,
        { includeSource: true, includeDest: true },
      ).filter((i) => i.currentOnEmpty === 'none');
      if (unresolved.length > 0) {
        setActiveWorkspaceTab('default-mapping');
        toast.error(
          `These required fields need an empty-value rule (a default value, or skip the record): ${unresolved
            .map((i) => i.field.label || i.field.key)
            .join(', ')}`,
        );
        return false;
      }
    }
    setSaving(true);
    try {
      await jobsApi.replaceFieldMappings(
        projectId,
        job.id,
        normalized as unknown as FieldMapping[],
      );
      setSaved(true);
      setShowDefaultsValidation(false);
      // Everything just saved is now persisted — lock it down again like any other
      // existing mapping, and drop back to edit mode.
      persistedSourceFieldsRef.current = new Set(
        toSave.map((m) => m.sourceField),
      );
      savedMappingsRef.current = cloneMappings(toSave);
      setMappingMode('edit');
      setTimeout(() => setSaved(false), 2500);
      toast.success(successMessage);
      refetch();
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Failed to save field mappings.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleExcludeConditionsChange = (
    conditions: ExcludeCondition[],
    logic: 'AND' | 'OR',
  ) => {
    setExcludeConditions(conditions);
    setExcludeConditionLogic(logic);
    setConditionsDirty(true);
    setConditionsError(null);
  };

  const handlePreviewConditions = async () => {
    const error = validateExcludeConditions(excludeConditions);
    if (error) {
      setConditionsError(error);
      toast.error(error);
      return;
    }
    if (excludeConditions.length === 0) {
      toast.info('Add a condition before previewing matches.');
      return;
    }

    setPreviewingConditions(true);
    try {
      const sample = await associationsApi.getSampleRecord(
        projectId,
        job.sourceObject,
      );
      if (!sample) {
        toast.info(
          'No previously synced source record is available to preview.',
        );
        return;
      }
      const matches = recordMatchesExcludeConditions(
        sample,
        excludeConditions,
        excludeConditionLogic,
      );
      if (matches) {
        toast.success('Sample preview: this record would be skipped.');
      } else {
        toast.info(
          'Sample preview: this record would continue to field mapping.',
        );
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ??
          'Could not load a source record for preview.',
      );
    } finally {
      setPreviewingConditions(false);
    }
  };

  // Own resource (PATCH /jobs/:id), own try/catch/toast — a failure here must
  // never look like the field-mapping save also failed, and vice versa.
  const persistExcludeConditions = async (): Promise<boolean> => {
    const error = validateExcludeConditions(excludeConditions);
    if (error) {
      setConditionsError(error);
      toast.error(error);
      return false;
    }
    try {
      const patch = {
        excludeConditions:
          excludeConditions.length > 0 ? excludeConditions : null,
        excludeConditionLogic,
      };
      await jobsApi.updateJob(projectId, job.id, patch);
      patchJob(patch);
      savedConditionsRef.current = {
        conditions: cloneConditions(excludeConditions),
        logic: excludeConditionLogic,
      };
      setConditionsDirty(false);
      setConditionsError(null);
      toast.success('Exclude conditions saved.');
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Failed to save exclude conditions.',
      );
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeWorkspaceTab === 'field-mapping') {
        const payload = mergeDefaultConfiguration(
          fieldMappings,
          savedMappingsRef.current,
        );
        const didSave = await persistMappings(
          payload,
          'Field mappings saved successfully.',
        );
        if (!didSave) return;
        setFieldMappings(cloneMappings(payload));
        setMappingDirty(false);
        if (!defaultsDirty) setDefaultMappings(cloneMappings(payload));
        return;
      }

      if (activeWorkspaceTab === 'default-mapping') {
        const payload = mergeDefaultConfiguration(
          fieldMappings,
          defaultMappings,
        );
        const didSave = await persistMappings(
          payload,
          'Default settings saved successfully.',
        );
        if (!didSave) return;
        setFieldMappings(cloneMappings(payload));
        setDefaultMappings(cloneMappings(payload));
        setMappingDirty(false);
        setDefaultsDirty(false);
        return;
      }

      await persistExcludeConditions();
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (activeWorkspaceTab === 'field-mapping') {
      const mappings = cloneMappings(savedMappingsRef.current);
      setFieldMappings(mappings);
      persistedSourceFieldsRef.current = new Set(
        mappings.map((mapping) => mapping.sourceField),
      );
      setMappingMode(mappings.length > 0 ? 'edit' : 'fresh-setup');
      setMappingDirty(false);
    } else if (activeWorkspaceTab === 'default-mapping') {
      setDefaultMappings(cloneMappings(savedMappingsRef.current));
      setDefaultsDirty(false);
      setShowDefaultsValidation(false);
    } else {
      const savedConditions = savedConditionsRef.current;
      setExcludeConditions(cloneConditions(savedConditions.conditions));
      setExcludeConditionLogic(savedConditions.logic);
      setConditionsDirty(false);
      setConditionsError(null);
    }
    setSaved(false);
  };

  if (loadingMappings || fieldsLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const requiredDefaultItems = getRequiredFieldItems(
    sourceFields,
    destFields,
    defaultMappings,
    {
      includeSource: job.syncDirection === 'two_way',
      includeDest: true,
    },
  );
  const unresolvedDefaultCount = requiredDefaultItems.filter(
    (item) =>
      item.currentOnEmpty === 'none' ||
      (item.currentOnEmpty === 'default' &&
        !isValidDefaultValue(item.field.type, item.currentDefaultValue)),
  ).length;
  const { anyDirty, activeDirty } = getWorkspaceDirtyState(activeWorkspaceTab, {
    mappingDirty,
    defaultsDirty,
    conditionsDirty,
  });
  const displayedConditionsError =
    conditionsError ??
    (conditionsDirty ? validateExcludeConditions(excludeConditions) : null);
  const saveLabel =
    activeWorkspaceTab === 'field-mapping'
      ? 'Save mappings'
      : activeWorkspaceTab === 'default-mapping'
        ? 'Save defaults'
        : 'Save conditions';

  return (
    <div
      ref={workspaceRef}
      className={anyDirty ? 'space-y-4 pb-24' : 'space-y-4'}
    >
      {isActive && anyDirty && (
        <div className="bg-warning/10 flex items-start gap-3 rounded-4xl px-4 py-3">
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-warning text-sm">
            You are changing the mapping of an active sync job. These changes
            will only apply to future syncs.
          </p>
        </div>
      )}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <Tabs
            value={activeWorkspaceTab}
            onValueChange={(value) =>
              setActiveWorkspaceTab(value as MappingWorkspaceTab)
            }
            className="gap-0"
          >
            <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="field-mapping">
                    Field Mappings
                    {mappingDirty && (
                      <span className="bg-warning size-1.5 rounded-full" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="default-mapping">
                    Default Mappings
                    {defaultsDirty && (
                      <span className="bg-warning size-1.5 rounded-full" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="skip-record">
                    Skip Record
                    {conditionsDirty && (
                      <span className="bg-warning size-1.5 rounded-full" />
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div
                ref={setMappingToolbarContainer}
                className="flex flex-wrap items-center gap-2"
              >
                {activeWorkspaceTab === 'default-mapping' && (
                  <>
                    <InputGroup className="min-w-52 flex-1 sm:w-64 sm:flex-none">
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <InputGroupInput
                        value={defaultSearch}
                        onChange={(event) =>
                          setDefaultSearch(event.target.value)
                        }
                        placeholder="Search default fields…"
                      />
                    </InputGroup>
                    <Button
                      type="button"
                      variant={
                        showOnlyUnresolvedDefaults ? 'secondary' : 'outline'
                      }
                      size="icon"
                      aria-label="Show unresolved default fields only"
                      aria-pressed={showOnlyUnresolvedDefaults}
                      title="Show unresolved fields only"
                      onClick={() =>
                        setShowOnlyUnresolvedDefaults((current) => !current)
                      }
                    >
                      <ListFilter />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDefaultAddRequest((value) => value + 1)}
                    >
                      <Plus /> Add default
                    </Button>
                  </>
                )}

                {activeWorkspaceTab === 'skip-record' && (
                  <>
                    <InputGroup className="min-w-52 flex-1 sm:w-64 sm:flex-none">
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <InputGroupInput
                        value={conditionSearch}
                        onChange={(event) =>
                          setConditionSearch(event.target.value)
                        }
                        placeholder="Search conditions…"
                      />
                    </InputGroup>
                    <Button
                      type="button"
                      onClick={() => {
                        setConditionSearch('');
                        setConditionAddRequest((value) => value + 1);
                      }}
                    >
                      <Plus /> Add condition
                    </Button>
                  </>
                )}
              </div>
            </div>

            <TabsContent value="field-mapping" className="space-y-4 p-5">
              {fieldMappings.length > 0 &&
                !fieldMappings.some((mapping) => mapping.matchDestKey) && (
                  <div className="bg-destructive/10 flex items-start gap-3 rounded-4xl px-4 py-3">
                    <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="text-destructive text-sm font-medium">
                        Match Field required
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Toggle the{' '}
                        <strong className="text-foreground">switch</strong> on
                        at least one mapped field to mark it as a Match Field.
                        This tells the sync how to find existing records in
                        HubSpot. Without it the job cannot be activated.
                      </p>
                    </div>
                  </div>
                )}

              <FieldMappingCanvas
                sourceFields={sourceFields as unknown as CanvasFieldDef[]}
                destFields={destFields as unknown as CanvasFieldDef[]}
                mappings={fieldMappings as unknown as CanvasMappingRow[]}
                onMappingsChange={
                  handleMappingsChange as unknown as (
                    mappings: CanvasMappingRow[],
                  ) => void
                }
                sourcePlatform={srcPlatform}
                destPlatform={dstPlatform}
                sourceObject={fmtObject(job.sourceObject)}
                destObject={fmtObject(job.destObject)}
                onRefreshFields={() => loadFields(true)}
                fieldsLoading={fieldsLoading}
                projectId={projectId}
                jobId={job.id}
                onAddSourceField={null}
                onAddDestField={null}
                showDirectionToggle={job.syncDirection === 'two_way'}
                showHeading={false}
                toolbarContainer={mappingToolbarContainer}
                toolbarControlSize="default"
                directionReadOnly={(row) =>
                  mappingMode === 'edit' &&
                  persistedSourceFieldsRef.current.has(row.sourceField)
                }
              />
            </TabsContent>

            <TabsContent value="default-mapping" className="p-5">
              {showDefaultsValidation && unresolvedDefaultCount > 0 && (
                <div className="bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-4xl px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {unresolvedDefaultCount} required field
                  {unresolvedDefaultCount === 1 ? '' : 's'} need attention.
                </div>
              )}
              <RequiredFieldDefaults
                sourceFields={sourceFields as unknown as CanvasFieldDef[]}
                destFields={destFields as unknown as CanvasFieldDef[]}
                sourcePlatform={srcPlatform}
                destPlatform={dstPlatform}
                mappings={defaultMappings as unknown as CanvasMappingRow[]}
                onMappingsChange={
                  handleDefaultsChange as unknown as (
                    mappings: CanvasMappingRow[],
                  ) => void
                }
                scope={
                  job.syncDirection === 'two_way' ? 'two_way' : 'dest_only'
                }
                showValidation={showDefaultsValidation}
                searchQuery={defaultSearch}
                unresolvedOnly={showOnlyUnresolvedDefaults}
                addRequestSignal={defaultAddRequest}
                showAddButton={false}
              />
            </TabsContent>

            <TabsContent value="skip-record" className="space-y-3 p-5">
              {displayedConditionsError && (
                <div
                  className="bg-destructive/10 text-destructive border-destructive/30 flex items-start gap-2 rounded-4xl border px-3 py-2 text-xs"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {displayedConditionsError}
                </div>
              )}
              <ExcludeConditionsEditor
                sourceFields={sourceFields as unknown as CanvasFieldDef[]}
                conditions={excludeConditions}
                conditionLogic={excludeConditionLogic}
                onChange={handleExcludeConditionsChange}
                searchQuery={conditionSearch}
                addRequestSignal={conditionAddRequest}
                showAddButton
                isDirty={conditionsDirty}
                onPreview={handlePreviewConditions}
                previewing={previewingConditions}
                layout="grid"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {activeDirty && (
        <div
          className={`bg-background/95 fixed right-0 bottom-0 left-0 z-40 border-t shadow-lg backdrop-blur ${
            sidebarState === 'collapsed'
              ? 'md:left-(--sidebar-width-icon)'
              : 'md:left-(--sidebar-width)'
          }`}
        >
          <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <span className="bg-warning mt-1.5 size-2 shrink-0 rounded-full" />
              <div>
                <p className="text-sm font-semibold">Unsaved changes</p>
                <p className="text-muted-foreground text-xs">
                  Save or discard the changes in this tab before leaving the
                  page.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={saving}
              >
                <RotateCcw /> Discard changes
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner /> : <Check />}
                {saving ? 'Saving...' : saved ? 'Saved!' : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
