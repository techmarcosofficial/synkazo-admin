import {
  AlertTriangle,
  Check,
  ExternalLink,
  Filter,
  Link2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { associationsApi } from '@/api/associations';
import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import type { CrossObjectProperty } from '@/api/jobs';
import CrossObjectPropertiesDialog from '@/components/fieldmapping/CrossObjectPropertiesDialog';
import { validateDestinationSkipConditions } from '@/components/fieldmapping/DestinationSkipConditionsEditor';
import { validateExcludeConditions } from '@/components/fieldmapping/ExcludeConditionsEditor';
import FieldMappingCanvas, {
  IconLegend,
  type FieldDef as CanvasFieldDef,
  type MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import JobFiltersDialog from '@/components/fieldmapping/JobFiltersDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  consolidateMappings,
  type ConsolidatedMapping,
} from '@/features/jobs/hooks';
import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';
import {
  fmtObject,
  toCanvasField,
  type CanvasField,
} from '@/features/jobs/utils';
import { recordMatchesExcludeConditions } from '@/lib/excludeConditions';
import { classifyTypePair } from '@/lib/fieldMatching';
import type { Connection, FieldMapping } from '@/types';
import type {
  DestinationSkipCondition,
  ExcludeCondition,
} from '@/types/conditions';

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
      transformType: m.transformType ?? 'direct',
      transformConfig:
        m.transformType === 'combine'
          ? (m.transformConfig ?? null)
          : m.destRules?.[dk]
            ? { rules: m.destRules[dk] }
            : (m.transformConfig ?? null),
      isRequired: m.isRequired ?? false,
      isMatchField: m.matchDestKey === dk,
      matchPriority: m.matchDestKey === dk ? (m.matchOrder ?? null) : null,
      updatePolicy:
        m.destUpdatePolicy?.[dk] === 'create_only' ? 'create_only' : 'always',
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
export const supportsCrossObjectProperties = (platformId: string) =>
  platformId === 'servicetitan' ||
  platformId === 'dataforma' ||
  platformId === 'texada';

const isConstant = (m: { sourceField: string; destField: string }) =>
  !m.sourceField || !m.destField;

const cloneMappings = (mappings: ConsolidatedMapping[]) =>
  JSON.parse(JSON.stringify(mappings)) as ConsolidatedMapping[];

const cloneConditions = (conditions: ExcludeCondition[]) =>
  JSON.parse(JSON.stringify(conditions)) as ExcludeCondition[];
const cloneDestinationConditions = (conditions: DestinationSkipCondition[]) =>
  JSON.parse(JSON.stringify(conditions)) as DestinationSkipCondition[];

export type MappingWorkspaceTab =
  'field-mapping' | 'default-mapping' | 'skip-record' | 'cross-object';

function FieldMappingSkeleton() {
  return (
    <Card
      className="gap-0 overflow-hidden py-0"
      role="status"
      aria-label="Loading field mappings"
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, column) => (
              <div key={column} className="space-y-3 rounded-3xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
                {Array.from({ length: 4 }).map((_, row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3 rounded-2xl border px-3 py-3"
                  >
                    <Skeleton className="size-5 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <span className="sr-only">Loading field mappings…</span>
    </Card>
  );
}

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
        : activeWorkspaceTab === 'skip-record'
          ? conditionsDirty
          : false;

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
  const getDraft = useFieldMappingDraftStore((state) => state.getDraft);
  const saveDraft = useFieldMappingDraftStore((state) => state.saveDraft);
  const clearTabDraft = useFieldMappingDraftStore(
    (state) => state.clearTabDraft,
  );
  const { state: sidebarState } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [mappingToolbarContainer, setMappingToolbarContainer] =
    useState<HTMLDivElement | null>(null);

  const targetField =
    searchParams.get('field') ||
    searchParams.get('highlightField') ||
    undefined;
  const targetSection = (searchParams.get('action') || undefined) as
    | import('@/components/fieldmapping/FieldSettingsDrawer').TargetDrawerSection
    | undefined;

  const handleClearTarget = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('field');
    nextParams.delete('highlightField');
    nextParams.delete('action');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Mappings State
  const [fieldMappings, setFieldMappings] = useState<ConsolidatedMapping[]>([]);
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
  const mappedDestKeys = useMemo(
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mappingDirty, setMappingDirty] = useState(false);
  const [attentionSignal, setAttentionSignal] = useState(0);
  const savedMappingsRef = useRef<ConsolidatedMapping[]>([]);

  // Exclude Conditions State
  const [excludeConditions, setExcludeConditions] = useState<
    ExcludeCondition[]
  >(job.excludeConditions ?? []);
  const [excludeConditionLogic, setExcludeConditionLogic] = useState<
    'AND' | 'OR'
  >(job.excludeConditionLogic ?? 'AND');
  const [destinationSkipConditions, setDestinationSkipConditions] = useState<
    DestinationSkipCondition[]
  >(job.destinationSkipConditions ?? []);
  const [conditionsDirty, setConditionsDirty] = useState(false);
  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [previewingConditions, setPreviewingConditions] = useState(false);
  const savedConditionsRef = useRef<{
    conditions: ExcludeCondition[];
    logic: 'AND' | 'OR';
    destinationConditions: DestinationSkipCondition[];
  }>({ conditions: [], logic: 'AND', destinationConditions: [] });

  // Dialog Controls
  const [showJobFiltersDialog, setShowJobFiltersDialog] = useState(false);
  const [showCrossObjectDialog, setShowCrossObjectDialog] = useState(false);

  const [loadingMappings, setLoadingMappings] = useState(true);
  const [mappingMode, setMappingMode] = useState<'edit' | 'fresh-setup'>(
    'edit',
  );
  const persistedSourceFieldsRef = useRef<Set<string>>(new Set());
  const [sourceFields, setSourceFields] = useState<CanvasField[]>([]);
  const [crossObjectProperties, setCrossObjectProperties] = useState<
    CrossObjectProperty[]
  >([]);
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
    const destinationConditions = cloneDestinationConditions(
      job.destinationSkipConditions ?? [],
    );
    savedConditionsRef.current = {
      conditions: cloneConditions(conditions),
      logic,
      destinationConditions: cloneDestinationConditions(destinationConditions),
    };

    const draft = getDraft(job.id);
    setExcludeConditions(
      draft?.conditionsDirty && draft.excludeConditions
        ? cloneConditions(draft.excludeConditions)
        : conditions,
    );
    setExcludeConditionLogic(
      draft?.conditionsDirty ? (draft.excludeConditionLogic ?? logic) : logic,
    );
    setDestinationSkipConditions(
      draft?.conditionsDirty && draft.destinationSkipConditions
        ? cloneDestinationConditions(draft.destinationSkipConditions)
        : destinationConditions,
    );
    setConditionsDirty(Boolean(draft?.conditionsDirty));
    setConditionsError(null);
  }, [job.id, getDraft]);

  useEffect(() => {
    jobsApi
      .listFieldMappings(projectId, job.id)
      .then((rows) => {
        const consolidated = consolidateMappings(rows);
        savedMappingsRef.current = cloneMappings(consolidated);
        persistedSourceFieldsRef.current = new Set(
          consolidated.map((m) => m.sourceField),
        );

        const draft = getDraft(job.id);
        const hasMappingDraft = Boolean(
          draft?.mappingDirty && draft.fieldMappings,
        );

        if (hasMappingDraft) {
          setFieldMappings(cloneMappings(draft!.fieldMappings!));
          setMappingDirty(true);
          if (draft!.mappingMode) setMappingMode(draft!.mappingMode);
        } else {
          setFieldMappings(consolidated);
          setMappingDirty(false);
          if (consolidated.length === 0) setMappingMode('fresh-setup');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMappings(false));
  }, [projectId, job.id, getDraft]);

  useEffect(() => {
    loadFields(false);
  }, [loadFields]);

  useEffect(() => {
    jobsApi
      .listCrossObjectProperties(projectId, job.id)
      .then(setCrossObjectProperties)
      .catch(() => setCrossObjectProperties([]));
  }, [job.id, projectId]);

  const anyDirty = mappingDirty || conditionsDirty;

  useEffect(() => {
    if (!anyDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => {
      window.removeEventListener('beforeunload', preventUnload);
    };
  }, [anyDirty]);

  const isActive = job.isEnabled;

  const handleMappingsChange = (newMappings: ConsolidatedMapping[]) => {
    setFieldMappings(newMappings);
    setMappingDirty(true);
    setSaved(false);
    const nextMode = newMappings.length === 0 ? 'fresh-setup' : mappingMode;
    if (newMappings.length === 0) setMappingMode('fresh-setup');

    saveDraft(job.id, {
      fieldMappings: newMappings,
      mappingDirty: true,
      mappingMode: nextMode,
    });
  };

  const persistMappings = async (
    toSave: ConsolidatedMapping[],
    successMessage: string,
  ): Promise<boolean> => {
    const normalized = normalizeMappings(toSave, job.syncDirection);
    const pairs = normalized.filter((m) => !isConstant(m));
    if (pairs.length < 2) {
      toast.error('At least 2 field mappings are required before saving.');
      return false;
    }
    if (!pairs.some((m) => m.isMatchField)) {
      setAttentionSignal((s) => s + 1);
      toast.error(
        'At least one Unique Identifier is required — designate an identifier key (like Email or ID) to look up matching records.',
        {
          action: {
            label: 'Review Issues',
            onClick: () => setAttentionSignal((s) => s + 1),
          },
          duration: 6000,
        },
      );
      return false;
    }

    const unmappedEnums = toSave.flatMap((m) => {
      if (m.dismissed) return [];
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      const sourceType = effectiveSourceFields.find(
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
      setAttentionSignal((s) => s + 1);
      toast.error(
        `Destination platform requires a Map Values rule for dropdown options: ${unmappedEnums.join(', ')}`,
        {
          action: {
            label: 'Review Issues',
            onClick: () => setAttentionSignal((s) => s + 1),
          },
          duration: 6000,
        },
      );
      return false;
    }

    const missingValue = normalized.filter(
      (m) =>
        (m.onEmpty === 'default' && !m.defaultValue) ||
        (m.reverseOnEmpty === 'default' && !m.reverseDefaultValue),
    );
    if (missingValue.length > 0) {
      setAttentionSignal((s) => s + 1);
      toast.error(
        `Missing fallback value for: ${missingValue
          .map((m) => m.destField || m.sourceField)
          .join(', ')}. Please specify a default value.`,
        {
          action: {
            label: 'Review Issues',
            onClick: () => setAttentionSignal((s) => s + 1),
          },
          duration: 6000,
        },
      );
      return false;
    }

    try {
      await jobsApi.replaceFieldMappings(
        projectId,
        job.id,
        normalized as unknown as FieldMapping[],
      );
      savedMappingsRef.current = cloneMappings(toSave);
      persistedSourceFieldsRef.current = new Set(
        toSave.map((mapping) => mapping.sourceField),
      );
      setMappingMode('edit');
      setSaved(true);
      toast.success(successMessage);
      refetch();
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Failed to save field mappings.',
      );
      return false;
    }
  };

  const handleExcludeConditionsChange = (
    conditions: ExcludeCondition[],
    logic: 'AND' | 'OR' = excludeConditionLogic,
  ) => {
    setExcludeConditions(conditions);
    setExcludeConditionLogic(logic);
    setConditionsDirty(true);
    setConditionsError(null);

    saveDraft(job.id, {
      excludeConditions: conditions,
      excludeConditionLogic: logic,
      conditionsDirty: true,
    });
  };

  const handleDestinationConditionsChange = (
    conditions: DestinationSkipCondition[],
  ) => {
    setDestinationSkipConditions(conditions);
    setConditionsDirty(true);
    setConditionsError(null);
    saveDraft(job.id, {
      destinationSkipConditions: conditions,
      conditionsDirty: true,
    });
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

  const persistExcludeConditions = async (): Promise<boolean> => {
    const error =
      validateExcludeConditions(excludeConditions) ??
      validateDestinationSkipConditions(destinationSkipConditions);
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
        destinationSkipConditions:
          destinationSkipConditions.length > 0
            ? destinationSkipConditions
            : null,
      };
      await jobsApi.updateJob(projectId, job.id, patch);
      patchJob(patch);
      savedConditionsRef.current = {
        conditions: cloneConditions(excludeConditions),
        logic: excludeConditionLogic,
        destinationConditions: cloneDestinationConditions(
          destinationSkipConditions,
        ),
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
      const didSave = await persistMappings(
        fieldMappings,
        'Field mappings saved successfully.',
      );
      if (!didSave) return;
      setFieldMappings(cloneMappings(fieldMappings));
      setMappingDirty(false);
      clearTabDraft(job.id, 'field-mapping');

      if (conditionsDirty) {
        const didSaveConditions = await persistExcludeConditions();
        if (didSaveConditions) {
          clearTabDraft(job.id, 'skip-record');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    const mappings = cloneMappings(savedMappingsRef.current);
    setFieldMappings(mappings);
    persistedSourceFieldsRef.current = new Set(
      mappings.map((mapping) => mapping.sourceField),
    );
    setMappingMode(mappings.length > 0 ? 'edit' : 'fresh-setup');
    setMappingDirty(false);
    clearTabDraft(job.id, 'field-mapping');

    const savedConditions = savedConditionsRef.current;
    setExcludeConditions(cloneConditions(savedConditions.conditions));
    setExcludeConditionLogic(savedConditions.logic);
    setDestinationSkipConditions(
      cloneDestinationConditions(savedConditions.destinationConditions),
    );
    setConditionsDirty(false);
    setConditionsError(null);
    clearTabDraft(job.id, 'skip-record');
    toast.info('Changes discarded.');
    setSaved(false);
  };

  if (loadingMappings || fieldsLoading) {
    return <FieldMappingSkeleton />;
  }

  const effectiveSourceFields: CanvasField[] = [
    ...sourceFields,
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

  const displayedConditionsError =
    conditionsError ??
    (conditionsDirty
      ? (validateExcludeConditions(excludeConditions) ??
        validateDestinationSkipConditions(destinationSkipConditions))
      : null);

  const isFirstTime =
    mappingMode === 'fresh-setup' && fieldMappings.length === 0;
  const totalFiltersCount =
    excludeConditions.length + destinationSkipConditions.length;

  return (
    <div
      ref={workspaceRef}
      className={anyDirty ? 'space-y-4 pb-8' : 'space-y-4'}
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

      <Card className="border-border bg-card gap-0 py-0 shadow-xs">
        <CardContent className="p-0">
          {/* Unified Workspace Header matching Dialog Header & Content design */}
          <div className="bg-muted/30 dark:bg-card/90 border-border flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-foreground text-base font-semibold tracking-tight">
                  Field Mappings
                </h3>
                <IconLegend size="icon-xs" variant="ghost" />
                <Badge variant="secondary" className="text-xs font-medium">
                  {fieldMappings.length} mapped
                </Badge>
                {anyDirty && (
                  <span className="text-muted-foreground hidden items-center gap-1.5 text-xs font-normal sm:inline-flex">
                    <span className="bg-warning size-1.5 animate-pulse rounded-full" />
                    Draft saved locally
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Map fields between your connected platforms to synchronize
                record data accurately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowJobFiltersDialog(true)}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <ShieldCheck className="text-primary size-3.5" />
                <span>Job Filters</span>
                {totalFiltersCount > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="ml-1 text-[10px]"
                  >
                    {totalFiltersCount}
                  </Badge>
                )}
              </Button>

              {supportsCrossObjectProperties(srcPlatform) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCrossObjectDialog(true)}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Link2 className="text-primary size-3.5" />
                  <span>Cross-Object</span>
                  {crossObjectProperties.length > 0 && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="ml-1 text-[10px]"
                    >
                      {crossObjectProperties.length}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Portal mount for FieldMappingCanvas controls */}
              <div
                ref={setMappingToolbarContainer}
                className="flex flex-wrap items-center gap-2"
              />
            </div>
          </div>

          <div className="space-y-4 p-5">
            {fieldMappings.length > 0 &&
              !fieldMappings.some((mapping) => mapping.matchDestKey) && (
                <div className="border-warning/30 bg-warning/10 flex items-start gap-3 rounded-3xl border px-4 py-3.5">
                  <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground text-xs font-semibold">
                        How should we identify matching records?
                      </p>
                      <Badge
                        size="xs"
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 border"
                      >
                        Unique Identifier
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Set at least one mapped field (like{' '}
                      <strong className="text-foreground">Email</strong> or{' '}
                      <strong className="text-foreground">Record ID</strong>) as
                      a unique identifier using the Set Identifier button or row
                      options. Synkazo uses this to identify matching records
                      and update them instead of creating duplicates.
                    </p>
                  </div>
                </div>
              )}

            {/* Active Job-Level Record Filters Summary Banner */}
            {totalFiltersCount > 0 && (
              <div
                className="bg-muted/40 border-border/70 flex flex-col gap-2.5 rounded-2xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                data-testid="job-filters-active-summary"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl sm:mt-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-semibold">
                        Active Job-Level Record Filters
                      </span>
                      {excludeConditions.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium"
                        >
                          Source:{' '}
                          {
                            excludeConditions.filter((c) => c.enabled !== false)
                              .length
                          }{' '}
                          Active ({excludeConditionLogic})
                        </Badge>
                      )}
                      {destinationSkipConditions.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium"
                        >
                          Destination:{' '}
                          {
                            destinationSkipConditions.filter(
                              (c) => c.enabled !== false,
                            ).length
                          }{' '}
                          Guards
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {excludeConditions.length > 0 &&
                      destinationSkipConditions.length > 0
                        ? 'Records will be skipped from sync if source conditions match, or destination guard matches.'
                        : excludeConditions.length > 0
                          ? 'Records matching source criteria will be skipped before syncing.'
                          : 'Records will be skipped when destination guard criteria match.'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJobFiltersDialog(true)}
                  className="h-8 shrink-0 gap-1.5 self-end text-xs font-medium sm:self-center"
                >
                  <Filter className="size-3" />
                  <span>Configure Filters</span>
                </Button>
              </div>
            )}

            <FieldMappingCanvas
              isDirty={mappingDirty}
              sourceFields={
                effectiveSourceFields as unknown as CanvasFieldDef[]
              }
              destFields={destFields as unknown as CanvasFieldDef[]}
              mappings={fieldMappings as unknown as CanvasMappingRow[]}
              onMappingsChange={
                handleMappingsChange as unknown as (
                  mappings: CanvasMappingRow[],
                ) => void
              }
              excludeConditions={excludeConditions}
              onExcludeConditionsChange={(conditions) =>
                handleExcludeConditionsChange(conditions, excludeConditionLogic)
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
              isFirstTime={isFirstTime}
              scrollToAttentionSignal={attentionSignal}
              targetField={targetField}
              targetSection={targetSection}
              onClearTarget={handleClearTarget}
            />

            <div className="border-border/60 bg-muted/40 mt-4 flex flex-col gap-3 rounded-2xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <Link2 className="size-4" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    Need to link related records together?
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Configure Record Associations to automatically link synced
                    records (e.g. Contacts to Companies or Jobs to Customers).
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs font-medium"
              >
                <Link
                  to={`/projects/${projectId}?tab=settings&section=associations`}
                >
                  <span>Configure Associations</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Save Draft Bar */}
      {anyDirty && (
        <div
          className={`bg-card fixed right-0 bottom-0 left-0 z-40 border-t shadow-lg backdrop-blur ${
            sidebarState === 'collapsed'
              ? 'md:left-(--sidebar-width-icon)'
              : 'md:left-(--sidebar-width)'
          }`}
        >
          <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <span className="bg-warning mt-1.5 size-2 shrink-0 rounded-full" />
              <div>
                <p className="text-sm font-semibold">Unsaved draft</p>
                <p className="text-muted-foreground text-xs">
                  Your changes are auto-saved locally. Save to apply them to
                  your sync job, or discard to restore saved state.
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
              <Button
                onClick={handleSave}
                disabled={!anyDirty || saving}
                variant={anyDirty ? 'default' : 'outline'}
              >
                {saving ? <Spinner /> : <Check />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Job Filters Dialog */}
      <JobFiltersDialog
        open={showJobFiltersDialog}
        onOpenChange={setShowJobFiltersDialog}
        sourceFields={effectiveSourceFields as unknown as CanvasFieldDef[]}
        destinationFields={destFields as unknown as CanvasFieldDef[]}
        sourceConditions={excludeConditions}
        sourceConditionLogic={excludeConditionLogic}
        destinationConditions={destinationSkipConditions}
        onSourceChange={handleExcludeConditionsChange}
        onDestinationChange={handleDestinationConditionsChange}
        onPreviewSource={handlePreviewConditions}
        previewingSource={previewingConditions}
        error={displayedConditionsError}
        mappedSourceKeys={mappedSourceKeys}
        mappedDestinationKeys={mappedDestKeys}
      />

      {/* Cross-Object Properties Dialog */}
      <CrossObjectPropertiesDialog
        open={showCrossObjectDialog}
        onOpenChange={setShowCrossObjectDialog}
        projectId={projectId}
        jobId={job.id}
        platformId={srcPlatform}
        sourceObject={job.sourceObject}
        sourceFields={sourceFields as unknown as CanvasFieldDef[]}
        properties={crossObjectProperties}
        onPropertiesChange={setCrossObjectProperties}
      />
    </div>
  );
}
