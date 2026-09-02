import { AlertTriangle, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import ExcludeConditionsEditor, {
  validateExcludeConditions,
} from '@/components/fieldmapping/ExcludeConditionsEditor';
import FieldMappingCanvas, {
  type FieldDef as CanvasFieldDef,
  type MappingRow as CanvasMappingRow,
} from '@/components/fieldmapping/FieldMappingCanvas';
import RequiredFieldDefaults from '@/components/fieldmapping/RequiredFieldDefaults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  consolidateMappings,
  type ConsolidatedMapping,
} from '@/features/jobs/hooks';
import {
  fmtObject,
  toCanvasField,
  type CanvasField,
} from '@/features/jobs/utils';
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

export default function FieldMappingTab() {
  const { projectId, job, refetch, patchJob } = useJobDetailContext();
  const [fieldMappings, setFieldMappings] = useState<ConsolidatedMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
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
    setExcludeConditions(job.excludeConditions ?? []);
    setExcludeConditionLogic(job.excludeConditionLogic ?? 'AND');
    setConditionsDirty(false);
  }, [job.id]);

  useEffect(() => {
    jobsApi
      .listFieldMappings(projectId, job.id)
      .then((rows) => {
        const consolidated = consolidateMappings(rows);
        setFieldMappings(consolidated);
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

  const isActive = job.isEnabled;

  const handleMappingsChange = (newMappings: ConsolidatedMapping[]) => {
    setFieldMappings(newMappings);
    setDirty(true);
    setSaved(false);
    // Cleared everything (via "Clear all" or deleting the last row one by one) —
    // whatever gets mapped next (Auto Map or manual Add Mapping) is a fresh setup.
    if (newMappings.length === 0) setMappingMode('fresh-setup');
  };

  // Takes the mapping set to persist explicitly, rather than reading `fieldMappings`
  // from closure — RequiredFieldDefaults' Save calls this immediately after handing
  // back a freshly-merged array, before that array has necessarily landed in state.
  const persistMappings = async (toSave: ConsolidatedMapping[]) => {
    const normalized = normalizeMappings(toSave, job.syncDirection);
    // Constants aren't field-to-field mappings, so they satisfy neither the
    // minimum-mappings rule nor the match-field rule.
    const pairs = normalized.filter((m) => !isConstant(m));
    if (pairs.length < 2) {
      toast.error('At least 2 field mappings are required before saving.');
      return;
    }
    if (!pairs.some((m) => m.isMatchField)) {
      toast.error(
        'At least one Match Field is required — toggle the switch on a mapping to set it.',
      );
      return;
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
      return;
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
      toast.error(
        `Set a default value for: ${missingValue
          .map((m) => m.destField || m.sourceField)
          .join(', ')}`,
      );
      return;
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
        toast.error(
          `These required fields need an empty-value rule (a default value, or skip the record): ${unresolved
            .map((i) => i.field.label || i.field.key)
            .join(', ')}`,
        );
        return;
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
      setDirty(false);
      setShowDefaultsValidation(false);
      // Everything just saved is now persisted — lock it down again like any other
      // existing mapping, and drop back to edit mode.
      persistedSourceFieldsRef.current = new Set(
        toSave.map((m) => m.sourceField),
      );
      setMappingMode('edit');
      setTimeout(() => setSaved(false), 2500);
      toast.success('Field mappings saved successfully.');
      refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Failed to save field mappings.',
      );
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
  };

  // Own resource (PATCH /jobs/:id), own try/catch/toast — a failure here must
  // never look like the field-mapping save also failed, and vice versa.
  const persistExcludeConditions = async () => {
    const error = validateExcludeConditions(excludeConditions);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const patch = {
        excludeConditions:
          excludeConditions.length > 0 ? excludeConditions : null,
        excludeConditionLogic,
      };
      await jobsApi.updateJob(projectId, job.id, patch);
      patchJob(patch);
      setConditionsDirty(false);
      toast.success('Exclude conditions saved.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Failed to save exclude conditions.',
      );
    }
  };

  // Two independent resources, two independent calls — each fires only when its
  // own state actually changed, and a failure in one must never hide the other.
  const handleSave = async () => {
    setSaving(true);
    try {
      if (dirty) await persistMappings(fieldMappings);
      if (conditionsDirty) await persistExcludeConditions();
    } finally {
      setSaving(false);
    }
  };

  if (loadingMappings || fieldsLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isActive && (dirty || conditionsDirty) && (
        <div className="bg-warning/10 flex items-start gap-3 rounded-lg px-4 py-3">
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-warning text-sm">
            You are changing the mapping of an active sync job. These changes
            will only apply to future syncs.
          </p>
        </div>
      )}
      {fieldMappings.length > 0 &&
        !fieldMappings.some((m) => m.matchDestKey) && (
          <div className="bg-destructive/10 flex items-start gap-3 rounded-lg px-4 py-3">
            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-destructive text-sm font-medium">
                Match Field required
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Toggle the <strong className="text-foreground">switch</strong>{' '}
                on at least one mapped field to mark it as a Match Field. This
                tells the sync how to find existing records in HubSpot (create
                vs update). Without it the job cannot be activated.
              </p>
            </div>
          </div>
        )}

      <FieldMappingCanvas
        sourceFields={sourceFields as unknown as CanvasFieldDef[]}
        destFields={destFields as unknown as CanvasFieldDef[]}
        mappings={fieldMappings as unknown as CanvasMappingRow[]}
        onMappingsChange={
          handleMappingsChange as unknown as (m: CanvasMappingRow[]) => void
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
        directionReadOnly={(row) =>
          mappingMode === 'edit' &&
          persistedSourceFieldsRef.current.has(row.sourceField)
        }
      />

      <RequiredFieldDefaults
        sourceFields={sourceFields as unknown as CanvasFieldDef[]}
        destFields={destFields as unknown as CanvasFieldDef[]}
        sourcePlatform={srcPlatform}
        destPlatform={dstPlatform}
        mappings={fieldMappings as unknown as CanvasMappingRow[]}
        onMappingsChange={
          handleMappingsChange as unknown as (m: CanvasMappingRow[]) => void
        }
        scope={job.syncDirection === 'two_way' ? 'two_way' : 'dest_only'}
        showValidation={showDefaultsValidation}
      />

      <Card>
        <CardContent>
          <h3 className="mb-1 font-semibold">Skip Records</h3>
          <p className="text-muted-foreground mb-4 text-xs">
            Exclude source records from this job entirely — e.g. skip employee
            accounts, test records, or anything matching a specific value.
          </p>
          <ExcludeConditionsEditor
            sourceFields={sourceFields as unknown as CanvasFieldDef[]}
            conditions={excludeConditions}
            conditionLogic={excludeConditionLogic}
            onChange={handleExcludeConditionsChange}
          />
        </CardContent>
      </Card>

      {(dirty || conditionsDirty) && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : <Check />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Mappings'}
          </Button>
        </div>
      )}
    </div>
  );
}
