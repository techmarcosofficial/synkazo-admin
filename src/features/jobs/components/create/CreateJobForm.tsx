import { AlertCircle } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  JobDetailsStep,
  StatusMappingStep,
  FieldMappingStep,
  DefaultValuesStep,
  ScheduleStep,
} from './steps';

import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import CustomFieldModal from '@/components/fieldmapping/CustomFieldModal';
import CustomObjectModal from '@/components/fieldmapping/CustomObjectModal';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  KNOWN_PIPELINE_OBJECTS,
  type JobConfig,
  type MappingRow,
  type PipelineItem,
  type PipelineStatusResponse,
  type SchedInterval,
} from '@/features/jobs/types';
import { toCanvasField, type CanvasField } from '@/features/jobs/utils';
import { supportsCustomObjects } from '@/lib/platformCapabilities';
import { getRequiredFieldItems } from '@/lib/requiredFields';
import { showToast } from '@/lib/toast';
import {
  useAddCustomObjectToCache,
  useObjectsByPlatformQuery,
  useProjectConnectionsQuery,
} from '@/queries/useConnections';
import { useEntitlements } from '@/queries/useEntitlements';
import { usePlatformsQuery } from '@/queries/usePlatforms';
import { useProjectQuery } from '@/queries/useProjects';
import type { Connection, FieldMapping, PlatformId } from '@/types';

const ALL_STEP_LABELS = [
  'Job Details',
  'Status Mapping',
  'Field Mapping',
  'Default Values',
  'Schedule',
];

const getActiveSteps = (
  hasPipeline: boolean,
  embedded: boolean,
  isTwoWay: boolean,
): string[] =>
  ALL_STEP_LABELS.filter(
    (s) =>
      (s === 'Status Mapping' ? hasPipeline : true) &&
      (s === 'Default Values' ? isTwoWay : true) &&
      (s === 'Schedule' ? !embedded : true),
  );

const DRAFT_KEY = (projectId: string) => `sb_draft_${projectId}`;

// Two-way jobs let the user set direction per row in the mapping canvas
// (defaults to "Both ways" the moment a row is toggled) — this only fills in
// a default for rows the user never touched, it never overrides an explicit
// per-row choice. FORWARD_ONLY remains the correct default for one-way jobs
// (and is what the backend already defaults to if omitted), so this is a
// no-op for the common case.
//
// Also flattens each consolidated row into one entry per (source, dest) pair: the backend's
// CreateFieldMappingDto.destField is a single string, so a source fanned out to several
// destinations must become several DTOs, not one DTO carrying an array the backend can't
// accept. Everything the canvas keys per destination — transform rules, empty-value policy,
// and matchDestKey (stored per pair as is_match_field) — has to be picked out per pair here;
// spreading the row would send the whole per-destination map on every pair instead.
const withDirection = (
  mappings: MappingRow[],
  syncDirection: string,
): FieldMapping[] =>
  mappings.flatMap((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return dests.map((destField) => ({
      sourceField: m.sourceField,
      destField,
      transformType: 'direct',
      transformConfig: m.destRules?.[destField]
        ? { rules: m.destRules[destField] }
        : null,
      isMatchField: m.matchDestKey === destField,
      matchPriority:
        m.matchDestKey === destField ? (m.matchOrder ?? null) : null,
      updatePolicy: m.destUpdatePolicy?.[destField] ?? 'always',
      onEmpty: m.destOnEmpty?.[destField] ?? 'none',
      defaultValue: m.destDefaults?.[destField] ?? null,
      reverseOnEmpty: m.destReverseOnEmpty?.[destField] ?? 'none',
      reverseDefaultValue: m.destReverseDefaults?.[destField] ?? null,
      direction:
        syncDirection === 'two_way'
          ? (m.direction ?? 'bidirectional')
          : m.direction,
    })) as unknown as FieldMapping[];
  });

export interface CreateJobFormHandle {
  /** Advances the current sub-step (validating + saving as needed). Resolves to whether it actually advanced. */
  next: () => Promise<boolean>;
  /** Goes back one sub-step. No-op on the first sub-step. */
  back: () => void;
  /** Saves and creates the job — only meaningful on the final (Schedule) step of the non-embedded flow. */
  save: () => Promise<void>;
}

export interface CreateJobFormState {
  canGoBack: boolean;
  isLastStep: boolean;
  saving: boolean;
  isDirty: boolean;
  /** 0-indexed current sub-step and total sub-step count — for a host-rendered progress indicator. */
  stepIndex: number;
  totalSteps: number;
  /** Labels of the currently active sub-steps (pipeline/schedule steps included/excluded as applicable) — for a host-rendered step list. */
  stepLabels: string[];
}

interface CreateJobFormProps {
  projectId: string;
  onCreated?: (jobId: string) => void;
  /** When true, hides the form's own stepper — a host (e.g. the Project Setup Wizard) drives navigation via the ref instead. */
  embedded?: boolean;
  onStateChange?: (state: CreateJobFormState) => void;
}

export const CreateJobForm = forwardRef<
  CreateJobFormHandle,
  CreateJobFormProps
>(function CreateJobForm(
  {
    projectId,
    onCreated = undefined,
    embedded = false,
    onStateChange = undefined,
  },
  ref,
) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftJobId, setDraftJobId] = useState<string | null>(null);

  const platformsQuery = usePlatformsQuery();
  const projectQuery = useProjectQuery(projectId);
  // Project-level sync-mode gate (null on legacy/unrestricted projects). When
  // set, the Job Type radio is locked to this direction and the config is seeded
  // to match below.
  const projectSyncMode = (projectQuery.data?.syncMode ?? null) as
    'one_way' | 'two_way' | null;
  const connectionsQuery = useProjectConnectionsQuery(projectId);
  // Creating custom fields on a connected platform is its own plan capability, on top of
  // whether the platform supports them at all.
  const canAddCustomFields = useEntitlements().customFields;
  const platforms = platformsQuery.data ?? [];
  const connections: Connection[] = connectionsQuery.data ?? [];
  const projectPlatforms = connections.map((c) => c.platformId) as PlatformId[];
  const hasConnection = connectionsQuery.isLoading
    ? null
    : connectionsQuery.isError
      ? false
      : connections.some((c) => c.status === 'connected');

  const objectsByPlatformQuery = useObjectsByPlatformQuery(
    projectId,
    projectPlatforms,
  );
  const objectsByPlatform = objectsByPlatformQuery.data ?? {};
  const addCustomObjectToCache = useAddCustomObjectToCache(
    projectId,
    projectPlatforms,
  );

  const [apiSourceFields, setApiSourceFields] = useState<CanvasField[]>([]);
  const [apiDestFields, setApiDestFields] = useState<CanvasField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [config, setConfig] = useState<JobConfig>({
    sourcePlatform: 'servicetitan',
    sourceObject: '',
    destPlatform: 'hubspot',
    destObject: '',
    name: '',
    syncDirection: 'one_way',
    sourceOfTruth: 'servicetitan',
    deleteHandling: 'ignore',
    // On by default: choosing two-way is choosing to hear about HubSpot
    // changes. The toggle below the direction picker turns it back off.
    hubspotWebhookEnabled: true,
    syncTrigger: 'both',
    idMappingSourceField: 'id',
    idMappingDestField: 'hs_object_id',
  });
  const [fieldMappings, setFieldMappings] = useState<MappingRow[]>([]);
  const [attentionInfo, setAttentionInfo] = useState({
    count: 0,
    reviewed: false,
  });
  // Bumped to smooth-scroll the "Needs your attention" section into view when
  // Next is blocked on it — see FieldMappingCanvas's scrollToAttentionSignal.
  const [attentionScrollSignal, setAttentionScrollSignal] = useState(0);
  // Whether every required field currently has an empty-value policy set —
  // driven by RequiredFieldDefaults from the mappings themselves (not from
  // unsaved drafts), so Next can't be clicked past a policy that was never
  // actually committed.
  const [defaultsResolved, setDefaultsResolved] = useState(false);
  // Turns a blank "Use a default value" input red once Next was actually
  // clicked and blocked on it, instead of leaving it unstyled indefinitely.
  const [showDefaultsValidation, setShowDefaultsValidation] = useState(false);
  const [customSourceObjects, setCustomSourceObjects] = useState<string[]>([]);
  const [customDestObjects, setCustomDestObjects] = useState<string[]>([]);
  const [customSourceFields, setCustomSourceFields] = useState<CanvasField[]>(
    [],
  );
  const [customDestFields, setCustomDestFields] = useState<CanvasField[]>([]);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState<string | null>(
    null,
  );
  const [showCustomObjectModal, setShowCustomObjectModal] = useState<
    string | null
  >(null);
  const [schedMode, setSchedMode] = useState('daily_time');
  const [schedTimes, setSchedTimes] = useState<string[]>(['09:00']);
  const [schedDays, setSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [schedInterval, setSchedInterval] = useState<SchedInterval>({
    amount: 15,
    unit: 'minutes',
  });
  const [startEnabled, setStartEnabled] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const [destPipelineId, setDestPipelineId] = useState('');
  const [statusMapping, setStatusMapping] = useState<
    Record<string, string | undefined>
  >({});
  const [pipelines, setPipelines] = useState<PipelineItem[]>([]);
  const [stStatuses, setStStatuses] = useState<string[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY(projectId));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.jobId) return;
      setDraftJobId(draft.jobId);
      if (draft.step != null) setStep(draft.step);
      if (draft.config) setConfig(draft.config);
      if (draft.fieldMappings) setFieldMappings(draft.fieldMappings);
      if (draft.schedMode) setSchedMode(draft.schedMode);
      if (draft.schedTimes) setSchedTimes(draft.schedTimes);
      if (draft.schedDays) setSchedDays(draft.schedDays);
      if (draft.schedInterval) setSchedInterval(draft.schedInterval);
      if (draft.startEnabled != null) setStartEnabled(draft.startEnabled);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const persistDraft = useCallback(
    (
      jobId: string | null,
      newStep: number,
      overrides: Record<string, unknown> = {},
    ) => {
      try {
        sessionStorage.setItem(
          DRAFT_KEY(projectId),
          JSON.stringify({
            jobId,
            step: newStep,
            config,
            fieldMappings,
            schedMode,
            schedTimes,
            schedDays,
            schedInterval,
            startEnabled,
            ...overrides,
          }),
        );
      } catch {
        /* ignore */
      }
    },
    [
      projectId,
      config,
      fieldMappings,
      schedMode,
      schedTimes,
      schedDays,
      schedInterval,
      startEnabled,
    ],
  );

  // Pin the job's direction to the project's gate. projectSyncMode is immutable,
  // so this is authoritative: it keeps config.syncDirection in lockstep with the
  // project and self-corrects if a restored draft (or anything else) sets a stale
  // value. No-op for legacy projects (projectSyncMode === null) and idempotent
  // once matched, so it never fights the connections-seeding effect below.
  useEffect(() => {
    if (!projectSyncMode || config.syncDirection === projectSyncMode) return;
    setConfig((prev) => ({ ...prev, syncDirection: projectSyncMode }));
  }, [projectSyncMode, config.syncDirection]);

  const [configSeeded, setConfigSeeded] = useState(false);
  useEffect(() => {
    if (!connectionsQuery.data || configSeeded) return;
    const conns = connectionsQuery.data as Connection[];
    const sourceConn = conns.find((c) => c.connectionType === 'source');
    const destConn = conns.find((c) => c.connectionType === 'destination');
    setConfig((prev) => ({
      ...prev,
      sourcePlatform: sourceConn?.platformId ?? prev.sourcePlatform,
      destPlatform: destConn?.platformId ?? prev.destPlatform,
      sourceOfTruth: sourceConn?.platformId ?? prev.sourceOfTruth,
    }));
    setConfigSeeded(true);
  }, [connectionsQuery.data, configSeeded]);

  const loadFields = useCallback(
    (refresh = false) => {
      if (!projectId || !config.sourceObject || !config.destObject) return;
      setFieldsLoading(true);
      setFieldsError(null);
      setApiSourceFields([]);
      setApiDestFields([]);
      Promise.all([
        connectionsApi.getProperties(
          projectId,
          config.sourcePlatform,
          config.sourceObject,
          { refresh },
        ),
        connectionsApi.getProperties(
          projectId,
          config.destPlatform,
          config.destObject,
          { refresh },
        ),
      ])
        .then(([srcProps, dstProps]) => {
          const srcError = srcProps.find((f) => f.name === '_discoveryError');
          const dstError = dstProps.find((f) => f.name === '_discoveryError');
          if (srcError || dstError)
            setFieldsError(
              srcError?.label || dstError?.label || 'Failed to load fields',
            );
          const srcFields = srcProps
            .filter((f) => f.name !== '_discoveryError')
            .map(toCanvasField);
          const dstFields = dstProps
            .filter((f) => f.name !== '_discoveryError')
            .map(toCanvasField);
          setApiSourceFields(srcFields);
          setApiDestFields(dstFields);
          // Auto-mapping deliberately does NOT happen here. FieldMappingCanvas owns it
          // (`autoMapOnLoad`) and matches far more intelligently; seeding a naive
          // exact-name mapping from here made the canvas see a non-empty mapping list
          // and skip its own pass entirely.
        })
        .catch((err) => {
          const e = err as { response?: { data?: { message?: string } } };
          setFieldsError(
            e?.response?.data?.message ??
              'Failed to load fields — check your platform connections.',
          );
        })
        .finally(() => setFieldsLoading(false));
    },
    [
      projectId,
      config.sourceObject,
      config.destObject,
      config.sourcePlatform,
      config.destPlatform,
    ],
  );

  // Mappings belong to the object pair they were built for. If the user goes back
  // and picks a different source/destination object, the old rows reference fields
  // that no longer exist — and, being non-empty, they'd also suppress the canvas's
  // auto-map for the new pair. Drop them so the new objects get mapped from scratch.
  const mappedObjectPairRef = useRef<string | null>(null);
  useEffect(() => {
    if (!config.sourceObject || !config.destObject) return;
    const pair = `${config.sourceObject}→${config.destObject}`;
    if (mappedObjectPairRef.current === pair) return;
    const isFirstPair = mappedObjectPairRef.current === null;
    mappedObjectPairRef.current = pair;
    if (!isFirstPair) setFieldMappings([]);
  }, [config.sourceObject, config.destObject]);

  const [hasPipelineStep, setHasPipelineStep] = useState(false);
  const fieldMappingStepIdx = hasPipelineStep ? 2 : 1;
  // Two-way jobs write into the source platform too (the reverse leg), so every
  // required field on either side needs a default/skip decision before the job
  // can be created — this step is where that happens, right after Field Mapping.
  const hasDefaultsStep = config.syncDirection === 'two_way';
  const defaultsStepIdx = fieldMappingStepIdx + 1;
  const scheduleStepIdx = fieldMappingStepIdx + (hasDefaultsStep ? 2 : 1);

  useEffect(() => {
    if (step === fieldMappingStepIdx) loadFields(false);
  }, [step, fieldMappingStepIdx, loadFields]);

  const loadPipelineData = useCallback(
    async (jobId: string | null) => {
      if (!jobId || !projectId) return;
      setPipelineLoading(true);
      setPipelineError(null);
      try {
        const [statuses, pipelineStatus] = await Promise.all([
          jobsApi
            .getSourceStatuses(projectId, jobId)
            .catch(() => [] as Array<{ id: string; label: string }>),
          (
            jobsApi.getPipelineStatus(
              projectId,
              jobId,
            ) as Promise<PipelineStatusResponse>
          ).catch(() => ({ required: false, pipelines: [] as PipelineItem[] })),
        ]);
        setStStatuses(
          (statuses as Array<string | { id: string; label: string }>).map(
            (s) => (typeof s === 'string' ? s : s.label),
          ),
        );
        const pipelineList: PipelineItem[] = pipelineStatus.pipelines ?? [];
        setPipelines(pipelineList);
        if (!destPipelineId && pipelineList.length > 0) {
          setDestPipelineId(pipelineList[0].id);
        }
      } catch {
        setPipelineError(
          'Failed to load pipeline data — check your connections.',
        );
      } finally {
        setPipelineLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (step === 1 && hasPipelineStep) loadPipelineData(draftJobId);
  }, [step, hasPipelineStep]);

  const getObjLabel = (platformId: string, objId: string): string =>
    (objectsByPlatform[platformId] || []).find((o) => o.id === objId)?.label ||
    objId;

  const availablePlatforms = platforms.filter((p) =>
    projectPlatforms.includes(p.platformId as PlatformId),
  );

  // Two-way sync only: the reverse leg writes into whichever side's platform has required-field
  // metadata (currently only ServiceTitan's discovery marks fields `required: true` — Dataforma
  // and others surface no required fields today, so this is a no-op for them until a platform
  // adds real required-field data), so required fields on either side must be mapped before the
  // job can be saved, regardless of which side that platform is configured as. Returns an error
  // message to show, or null if the mapping set is fine. One-way jobs always return null here —
  // this only ever engages under the exact same condition FieldMappingCanvas uses to surface
  // these fields in the first place.
  // Constants (one side deliberately empty) fill a required field but aren't
  // field-to-field mappings, so they don't count toward the two-mapping minimum.
  const pairMappings = fieldMappings.filter((m) => {
    const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
    return m.sourceField && dests.some(Boolean);
  });

  // Defense-in-depth final check before actually creating the job — mirrors the
  // match-field/pairMappings checks in handleSave below, which are also already
  // enforced earlier in the flow (here, by the Default Values step's own Save
  // gate) but re-checked here in case state was reached some other way. A
  // required field with no counterpart is no longer "missing" on its own —
  // RequiredFieldDefaults turns it into a constant, which getRequiredFieldItems
  // already recognises as resolved.
  const validateRequiredFields = (): string | null => {
    if (config.syncDirection !== 'two_way') return null;
    const sourceFields = [...apiSourceFields, ...customSourceFields];
    const destFields = [...apiDestFields, ...customDestFields];
    const unresolved = getRequiredFieldItems(
      sourceFields,
      destFields,
      fieldMappings,
      { includeSource: true, includeDest: true },
    ).filter((i) => i.currentOnEmpty === 'none');
    if (!unresolved.length) return null;
    return `These required fields need a default value or a skip rule: ${unresolved
      .map((i) => i.field.label || i.field.key)
      .join(', ')}`;
  };

  const validateStep0 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!config.sourceObject) errs.sourceObject = 'Select a source object';
    if (!config.destObject) errs.destObject = 'Select a destination object';
    if (!config.name.trim())
      errs.name =
        'Job name is required — enter a name for this job before continuing';
    if (
      config.sourceObject &&
      config.destObject &&
      config.sourcePlatform === config.destPlatform &&
      config.sourceObject.toLowerCase() === config.destObject.toLowerCase()
    ) {
      errs.destObject =
        'Destination object must differ from the source object when both are on the same platform';
    }
    return errs;
  };

  const handleNext = async (): Promise<boolean> => {
    if (step === 0) {
      const errs = validateStep0();
      if (Object.keys(errs).length) {
        setErrors(errs);
        return false;
      }
      setErrors({});
      setSaving(true);
      try {
        const jobData = {
          name: config.name,
          sourceObject: config.sourceObject.toLowerCase(),
          destObject: config.destObject.toLowerCase(),
          syncDirection: config.syncDirection,
          ...(config.syncDirection === 'two_way' && {
            sourceOfTruth: config.sourceOfTruth,
            deleteHandling: config.deleteHandling,
            hubspotWebhookEnabled: config.hubspotWebhookEnabled,
          }),
          syncTrigger: config.syncTrigger,
          idMappingSourceField: config.idMappingSourceField,
          idMappingDestField: config.idMappingDestField,
        };
        let savedId = draftJobId;
        if (!savedId) {
          const job = await jobsApi.createJob(projectId, jobData);
          savedId = job.id;
          setDraftJobId(savedId);
        } else {
          try {
            await jobsApi.updateJob(projectId, savedId, jobData);
          } catch {
            const job = await jobsApi.createJob(projectId, jobData);
            savedId = job.id;
            setDraftJobId(savedId);
          }
        }
        const clientKnows = KNOWN_PIPELINE_OBJECTS.has(jobData.destObject);
        const ps = await (
          jobsApi.getPipelineStatus(
            projectId,
            savedId,
          ) as Promise<PipelineStatusResponse>
        ).catch(() => null);
        setHasPipelineStep(clientKnows || ps?.required === true);
        persistDraft(savedId, 1);
        setStep(1);
        setSaving(false);
        return true;
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(
          e?.response?.data?.message ?? 'Failed to save job. Please try again.',
        );
        setSaving(false);
        return false;
      }
    } else if (hasPipelineStep && step === 1) {
      setSaving(true);
      try {
        if (draftJobId && destPipelineId) {
          await jobsApi.updateJob(projectId, draftJobId, {
            destPipelineId,
            statusMapping:
              Object.keys(statusMapping).length > 0 ? statusMapping : undefined,
          } as Record<string, unknown> as Parameters<
            typeof jobsApi.updateJob
          >[2]);
        }
        persistDraft(draftJobId, 2);
        setStep(2);
        return true;
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(
          e?.response?.data?.message ??
            'Failed to save status mapping. Please try again.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    } else if (step === fieldMappingStepIdx) {
      if (attentionInfo.count > 0 && !attentionInfo.reviewed) {
        toast.error('Review the fields that need attention before continuing.');
        setAttentionScrollSignal((n) => n + 1);
        return false;
      }
      if (pairMappings.length < 2) {
        toast.error(
          'At least 2 field mappings are required before continuing.',
        );
        return false;
      }
      if (!fieldMappings.some((m) => m.matchDestKey)) {
        toast.error(
          'At least one Match Field is required — toggle the switch on a mapping to set it.',
        );
        return false;
      }
      // Two-way jobs still need required-field defaults resolved — that's the
      // next step's job, so mappings aren't persisted yet (saving now, before
      // ServiceTitan-required fields have a policy, would be rejected by the
      // API's own assertRequiredFieldsMapped gate).
      if (hasDefaultsStep) {
        persistDraft(draftJobId, defaultsStepIdx);
        setStep(defaultsStepIdx);
        return true;
      }
      setSaving(true);
      try {
        if (draftJobId) {
          await jobsApi.replaceFieldMappings(
            projectId,
            draftJobId,
            withDirection(
              fieldMappings,
              config.syncDirection,
            ) as FieldMapping[],
          );
        }
        if (embedded) {
          sessionStorage.removeItem(DRAFT_KEY(projectId));
          onCreated?.(draftJobId!);
          return true;
        }
        persistDraft(draftJobId, scheduleStepIdx);
        setStep(scheduleStepIdx);
        return true;
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(
          e?.response?.data?.message ??
            'Failed to save field mappings. Please try again.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    } else if (hasDefaultsStep && step === defaultsStepIdx) {
      if (!defaultsResolved) {
        setShowDefaultsValidation(true);
        toast.error(
          'Every required field needs a default value or a skip rule before continuing.',
        );
        return false;
      }
      setShowDefaultsValidation(false);
      setSaving(true);
      try {
        if (draftJobId) {
          await jobsApi.replaceFieldMappings(
            projectId,
            draftJobId,
            withDirection(
              fieldMappings,
              config.syncDirection,
            ) as FieldMapping[],
          );
        }
        if (embedded) {
          sessionStorage.removeItem(DRAFT_KEY(projectId));
          onCreated?.(draftJobId!);
          return true;
        }
        persistDraft(draftJobId, scheduleStepIdx);
        setStep(scheduleStepIdx);
        return true;
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(
          e?.response?.data?.message ??
            'Failed to save field mappings. Please try again.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    }
    return false;
  };

  const handleBack = () => {
    const newStep = step - 1;
    if (draftJobId) persistDraft(draftJobId, newStep);
    setStep(newStep);
  };

  const getIntervalMinutes = () =>
    schedInterval.unit === 'hours'
      ? schedInterval.amount * 60
      : schedInterval.amount;

  const describeSchedule = () => {
    if (config.syncDirection === 'two_way') return 'Every ~2 min (automatic)';
    if (schedMode === 'interval') {
      const m = getIntervalMinutes();
      return m >= 60 && m % 60 === 0 ? `Every ${m / 60}h` : `Every ${m} min`;
    }
    if (schedMode === 'daily_time')
      return `Daily at ${schedTimes[0] || '09:00'}`;
    if (schedMode === 'day_specific') {
      const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${(schedDays || []).map((d) => DAYS[d]).join('/')} at ${schedTimes[0] || '09:00'}`;
    }
    return schedMode;
  };

  const getConnectionForPlatform = (
    platformId: string,
  ): Connection | undefined =>
    connections.find(
      (c) => c.platformId === platformId && c.status === 'connected',
    );

  const handleSave = async () => {
    if (pairMappings.length < 2) {
      toast.error('At least 2 field mappings are required before saving.');
      return;
    }
    if (!fieldMappings.some((m) => m.matchDestKey)) {
      toast.error(
        'At least one Match Field is required — toggle the switch on a mapping to set it.',
      );
      return;
    }
    const requiredFieldsError = validateRequiredFields();
    if (requiredFieldsError) {
      toast.error(requiredFieldsError);
      return;
    }
    const isTwoWay = config.syncDirection === 'two_way';
    // Two-way sync is not user-schedulable (item 5): skip schedule validation and
    // persist an empty schedule so the backend applies its fixed system interval.
    if (!isTwoWay && schedMode !== 'interval' && schedTimes.length === 0) {
      toast.error('Add at least one time for the schedule.');
      return;
    }
    if (!isTwoWay && schedMode === 'day_specific' && schedDays.length === 0) {
      toast.error('Select at least one day for the schedule.');
      return;
    }
    const schedPayload = isTwoWay
      ? {
          scheduleMode: null,
          scheduleTimes: null,
          scheduleDays: null,
          intervalMinutes: null,
          cronExpression: null,
        }
      : {
          scheduleMode: schedMode,
          scheduleTimes: schedMode !== 'interval' ? schedTimes : null,
          scheduleDays: schedMode === 'day_specific' ? schedDays : null,
          intervalMinutes:
            schedMode === 'interval' ? getIntervalMinutes() : null,
          cronExpression: null,
        };
    setSaving(true);
    try {
      let jobId = draftJobId;

      const pipelinePayload =
        hasPipelineStep && destPipelineId
          ? {
              destPipelineId,
              statusMapping:
                Object.keys(statusMapping).length > 0
                  ? statusMapping
                  : undefined,
            }
          : {};

      if (jobId) {
        await jobsApi.updateJob(projectId, jobId, {
          ...schedPayload,
          ...pipelinePayload,
        } as unknown as Parameters<typeof jobsApi.updateJob>[2]);
      } else {
        const job = await jobsApi.createJob(projectId, {
          name: config.name,
          sourceObject: config.sourceObject.toLowerCase(),
          destObject: config.destObject.toLowerCase(),
          syncDirection: config.syncDirection,
          ...(config.syncDirection === 'two_way' && {
            sourceOfTruth: config.sourceOfTruth,
            deleteHandling: config.deleteHandling,
            hubspotWebhookEnabled: config.hubspotWebhookEnabled,
          }),
          syncTrigger: config.syncTrigger,
          idMappingSourceField: config.idMappingSourceField,
          idMappingDestField: config.idMappingDestField,
          ...schedPayload,
          ...pipelinePayload,
        } as unknown as Parameters<typeof jobsApi.createJob>[1]);
        jobId = job.id;
        if (fieldMappings.length > 0) {
          await jobsApi.replaceFieldMappings(
            projectId,
            jobId,
            withDirection(
              fieldMappings,
              config.syncDirection,
            ) as FieldMapping[],
          );
        }
      }

      if (startEnabled) {
        await jobsApi.toggleJob(projectId, jobId!);
      }

      sessionStorage.removeItem(DRAFT_KEY(projectId));
      showToast.success('Sync job created successfully!');

      if (onCreated) {
        onCreated(jobId!);
      } else {
        navigate(`/projects/${projectId}/jobs/${jobId}`);
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ?? 'Failed to save job. Please try again.',
      );
      setSaving(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({ next: handleNext, back: handleBack, save: handleSave }),
    [handleNext, handleBack, handleSave],
  );

  useEffect(() => {
    const activeSteps = getActiveSteps(
      hasPipelineStep,
      embedded,
      hasDefaultsStep,
    );
    onStateChange?.({
      canGoBack: step > 0,
      isLastStep: step === (embedded ? scheduleStepIdx - 1 : scheduleStepIdx),
      saving,
      isDirty:
        draftJobId !== null ||
        config.name.trim() !== '' ||
        config.sourceObject !== '' ||
        config.destObject !== '' ||
        fieldMappings.length > 0,
      stepIndex: step,
      totalSteps: activeSteps.length,
      stepLabels: activeSteps,
    });
  }, [
    embedded,
    step,
    fieldMappingStepIdx,
    scheduleStepIdx,
    hasDefaultsStep,
    saving,
    draftJobId,
    config.name,
    config.sourceObject,
    config.destObject,
    fieldMappings.length,
    hasPipelineStep,
  ]);

  if (hasConnection === null) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Card className="border">
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-start gap-2">
              <Skeleton className="h-24 flex-1" />
              <Skeleton className="mt-6 size-9 shrink-0 rounded-lg" />
              <Skeleton className="h-24 flex-1" />
            </div>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasConnection === false) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Connection Required"
        description="You must configure and connect at least one platform before creating jobs."
      />
    );
  }

  const summaryItems: [string, string][] = [
    ['Job Name', config.name],
    [
      'Source',
      `${platforms.find((p) => p.platformId === config.sourcePlatform)?.label ?? config.sourcePlatform} · ${getObjLabel(config.sourcePlatform, config.sourceObject)}`,
    ],
    [
      'Destination',
      `${platforms.find((p) => p.platformId === config.destPlatform)?.label ?? config.destPlatform} · ${getObjLabel(config.destPlatform, config.destObject)}`,
    ],
    [
      'Job Type',
      config.syncDirection === 'one_way' ? 'One-Way →' : 'Two-Way ↔',
    ],
    [
      'Job Behavior',
      config.syncTrigger === 'both'
        ? 'New & Updated'
        : config.syncTrigger === 'new'
          ? 'New Records'
          : 'Updated Records',
    ],
    [
      'Field Mappings',
      (() => {
        const count = fieldMappings.reduce(
          (n, m) => n + (Array.isArray(m.destField) ? m.destField.length : 1),
          0,
        );
        return `${count} mapping${count !== 1 ? 's' : ''}`;
      })(),
    ],
    ['Schedule', describeSchedule()],
    ['Start Status', startEnabled ? 'Active' : 'Paused'],
  ];

  return (
    <div className="w-full">
      {step === 0 && (
        <JobDetailsStep
          config={config}
          setConfig={setConfig}
          projectSyncMode={projectSyncMode}
          errors={errors}
          setErrors={setErrors}
          availablePlatforms={availablePlatforms}
          objectsByPlatform={objectsByPlatform}
          customSourceObjects={customSourceObjects}
          customDestObjects={customDestObjects}
          sourceConnection={getConnectionForPlatform(config.sourcePlatform)}
          destConnection={getConnectionForPlatform(config.destPlatform)}
          onAddCustomObject={(side) =>
            setShowCustomObjectModal(side === 'source' ? 'source' : 'dest')
          }
          projectId={projectId}
        />
      )}

      {hasPipelineStep && step === 1 && (
        <StatusMappingStep
          stStatuses={stStatuses}
          pipelines={pipelines}
          destPipelineId={destPipelineId}
          onPipelineChange={(pid) => {
            setDestPipelineId(pid);
            setStatusMapping({});
          }}
          statusMapping={statusMapping}
          onStatusMappingChange={setStatusMapping}
          loading={pipelineLoading}
          error={pipelineError}
          onRetry={() => loadPipelineData(draftJobId)}
        />
      )}

      {step === fieldMappingStepIdx && (
        <FieldMappingStep
          sourcePlatform={config.sourcePlatform}
          destPlatform={config.destPlatform}
          sourceObjectLabel={getObjLabel(
            config.sourcePlatform,
            config.sourceObject,
          )}
          destObjectLabel={getObjLabel(config.destPlatform, config.destObject)}
          apiSourceFields={apiSourceFields}
          apiDestFields={apiDestFields}
          customSourceFields={customSourceFields}
          customDestFields={customDestFields}
          onRemoveCustomSourceField={(key) => {
            setCustomSourceFields((p) => p.filter((x) => x.key !== key));
            setFieldMappings((p) => p.filter((m) => m.sourceField !== key));
          }}
          onRemoveCustomDestField={(key) => {
            setCustomDestFields((p) => p.filter((x) => x.key !== key));
            setFieldMappings((p) =>
              p.filter((m) => {
                const d = Array.isArray(m.destField)
                  ? m.destField
                  : [m.destField as string];
                return !d.includes(key);
              }),
            );
          }}
          fieldsLoading={fieldsLoading}
          fieldsError={fieldsError}
          fieldMappings={fieldMappings}
          onMappingsChange={setFieldMappings}
          onRefreshFields={() => loadFields(true)}
          onAddSourceField={
            supportsCustomObjects(config.sourcePlatform)
              ? () => setShowCustomFieldForm('source')
              : null
          }
          onAddDestField={
            supportsCustomObjects(config.destPlatform)
              ? () => setShowCustomFieldForm('dest')
              : null
          }
          // Plan-locked rather than hidden: the button stays visible and explains itself.
          addFieldLocked={!canAddCustomFields}
          projectId={projectId}
          showDirectionToggle={config.syncDirection === 'two_way'}
          onAttentionReviewChange={setAttentionInfo}
          scrollToAttentionSignal={attentionScrollSignal}
        />
      )}

      {hasDefaultsStep && step === defaultsStepIdx && (
        <DefaultValuesStep
          sourcePlatform={config.sourcePlatform}
          destPlatform={config.destPlatform}
          apiSourceFields={apiSourceFields}
          apiDestFields={apiDestFields}
          customSourceFields={customSourceFields}
          customDestFields={customDestFields}
          fieldMappings={fieldMappings}
          onMappingsChange={setFieldMappings}
          onResolvedChange={setDefaultsResolved}
          showValidation={showDefaultsValidation}
        />
      )}

      {!embedded && step === scheduleStepIdx && (
        <ScheduleStep
          schedMode={schedMode}
          setSchedMode={setSchedMode}
          schedTimes={schedTimes}
          setSchedTimes={setSchedTimes}
          schedDays={schedDays}
          setSchedDays={setSchedDays}
          schedInterval={schedInterval}
          setSchedInterval={setSchedInterval}
          startEnabled={startEnabled}
          setStartEnabled={setStartEnabled}
          summaryItems={summaryItems}
          syncDirection={config.syncDirection}
        />
      )}

      {showCustomFieldForm === 'source' && (
        <CustomFieldModal
          side="Source"
          platformId={config.sourcePlatform}
          projectId={projectId}
          objectType={config.sourceObject}
          onAdd={(f) => {
            setCustomSourceFields((prev) => [
              {
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required,
                isCustom: true,
                readOnly: false,
              },
              ...prev,
            ]);
            setShowCustomFieldForm(null);
          }}
          onClose={() => setShowCustomFieldForm(null)}
        />
      )}
      {showCustomFieldForm === 'dest' && (
        <CustomFieldModal
          side="Destination"
          platformId={config.destPlatform}
          projectId={projectId}
          objectType={config.destObject}
          onAdd={(f) => {
            setCustomDestFields((prev) => [
              {
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required,
                isCustom: true,
                readOnly: false,
              },
              ...prev,
            ]);
            setShowCustomFieldForm(null);
          }}
          onClose={() => setShowCustomFieldForm(null)}
        />
      )}

      {showCustomObjectModal === 'source' && (
        <CustomObjectModal
          side="Source"
          platformId={config.sourcePlatform}
          projectId={projectId}
          connection={getConnectionForPlatform(config.sourcePlatform)}
          onAdd={({ name, objectTypeId, fields }) => {
            const id = objectTypeId || name.toLowerCase().replace(/\s+/g, '_');
            if (objectTypeId) {
              addCustomObjectToCache(config.sourcePlatform, {
                id,
                label: name,
                isCustom: true,
              });
            } else {
              setCustomSourceObjects((p) => [...p, name]);
              setCustomSourceFields((p) => [
                ...p,
                ...fields
                  .filter((f) => !p.find((x) => x.key === f.key))
                  .map((f) => ({
                    key: f.key,
                    label: f.key,
                    type: f.type,
                    required: f.required,
                    isCustom: true,
                    readOnly: false,
                  })),
              ]);
            }
            setConfig((c) => ({ ...c, sourceObject: id }));
          }}
          onClose={() => setShowCustomObjectModal(null)}
        />
      )}
      {showCustomObjectModal === 'dest' && (
        <CustomObjectModal
          side="Destination"
          platformId={config.destPlatform}
          projectId={projectId}
          connection={getConnectionForPlatform(config.destPlatform)}
          onAdd={({ name, objectTypeId, fields }) => {
            const id = objectTypeId || name.toLowerCase().replace(/\s+/g, '_');
            if (objectTypeId) {
              addCustomObjectToCache(config.destPlatform, {
                id,
                label: name,
                isCustom: true,
              });
            } else {
              setCustomDestObjects((p) => [...p, name]);
              setCustomDestFields((p) => [
                ...p,
                ...fields
                  .filter((f) => !p.find((x) => x.key === f.key))
                  .map((f) => ({
                    key: f.key,
                    label: f.key,
                    type: f.type,
                    required: f.required,
                    isCustom: true,
                    readOnly: false,
                  })),
              ]);
            }
            setConfig((c) => ({ ...c, destObject: id }));
          }}
          onClose={() => setShowCustomObjectModal(null)}
        />
      )}
    </div>
  );
});
