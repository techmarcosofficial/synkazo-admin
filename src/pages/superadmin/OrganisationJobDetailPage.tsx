import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Settings2,
  Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import StartSyncModal from '@/components/sync/StartSyncModal';
import {
  consolidateMappings,
  type ExtJob,
  type ExtSyncRun,
  type ScheduleTogglePayload,
} from '@/features/jobs/hooks';
import type { FieldMapping, Project, ProjectEnvironment } from '@/types';
import type { SuperAdminRunJobDto } from '@/types/superAdmin';
import OrganisationJobMappingPanel from './OrganisationJobMappingPanel';
import OrganisationJobPipelinePanel from './OrganisationJobPipelinePanel';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  JobDetailProvider,
  type JobDetailContextValue,
} from '@/features/jobs/components/detail/context';
import OverviewTab from '@/features/jobs/components/detail/tabs/OverviewTab';
import JobGeneralCard from '@/features/jobs/components/detail/settings/JobGeneralCard';
import JobRetryCard from '@/features/jobs/components/detail/settings/JobRetryCard';
import JobSkipUpdateCard from '@/features/jobs/components/detail/settings/JobSkipUpdateCard';
import SyncDirectionFields from '@/features/jobs/components/SyncDirectionFields';
import RunHistoryTab from '@/features/jobs/components/detail/tabs/RunHistoryTab';
import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import { KNOWN_PIPELINE_OBJECTS } from '@/features/jobs/types';
import type { JobDetailTabId } from '@/features/jobs/lib/jobDetailTabs';
import type { buildScheduleUpdatePayload } from '@/features/jobs/lib/jobScheduleSettings';
import {
  useSuperAdminJobQuery,
  useSuperAdminJobRunsQuery,
  useSuperAdminProjectQuery,
  useRunSuperAdminJobMutation,
  useSuperAdminRunStatusQuery,
  useSetSuperAdminJobEnabledMutation,
  useSetSuperAdminJobSyncEnabledMutation,
  usePauseSuperAdminJobScheduleMutation,
  useResumeSuperAdminJobScheduleMutation,
  useUpdateSuperAdminJobMutation,
} from '@/queries/useSuperAdmin';
import type {
  SuperAdminJobDetail,
  SuperAdminJobRunListItem,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';

type JobTab =
  'overview' | 'field-mapping' | 'pipeline' | 'run-history' | 'settings';
type SettingsSection = 'general' | 'advanced' | 'closed';

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : format(date, 'PPp');
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-w-0 rounded-2xl border p-3">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">
        {value ?? '—'}
      </dd>
    </div>
  );
}



function JobSetupJourney({
  job,
  runs,
  pipelineRequired,
  activeTab,
  onTabChange,
  onRun,
}: {
  job: SuperAdminJobDetail;
  runs: SuperAdminJobRunListItem[];
  pipelineRequired: boolean;
  activeTab: JobTab;
  onTabChange: (tab: JobTab) => void;
  onRun: () => void;
}) {
  const mappingReady = Boolean(
    job.fieldMappings?.length &&
    job.fieldMappings.some((mapping) => mapping.isMatchField),
  );
  const pipelineReady =
    !pipelineRequired ||
    Boolean(
      job.destPipelineId &&
      job.statusMapping &&
      Object.keys(job.statusMapping).length,
    );
  const testComplete = Boolean(
    job.lastSyncedAt ||
    runs.some((run) => run.status === 'completed' || run.status === 'success'),
  );
  if (testComplete) return null;

  const stage = !mappingReady
    ? 'field-mapping'
    : !pipelineReady
      ? 'pipeline'
      : 'overview';
  const steps: SetupJourneyStep[] = [
    {
      title: 'Field Mapping',
      description: 'Match source fields to their destination fields.',
      status: mappingReady ? 'complete' : 'current',
      isCurrentTab: activeTab === 'field-mapping',
      onSelect: () => onTabChange('field-mapping'),
    },
    ...(pipelineRequired
      ? [
          {
            title: 'Configure Pipeline',
            description:
              'Choose the destination pipeline required by this job.',
            status: !mappingReady
              ? ('upcoming' as const)
              : pipelineReady
                ? ('complete' as const)
                : ('current' as const),
            isCurrentTab: activeTab === 'pipeline',
            onSelect: () => onTabChange('pipeline'),
          },
        ]
      : []),
    {
      title: 'Run & Review',
      description:
        'Run a limited sync and review the result before automating it.',
      status: mappingReady && pipelineReady ? 'current' : 'upcoming',
      isCurrentTab: activeTab === 'overview',
      onSelect: () => onTabChange('overview'),
    },
    {
      title: 'Automate (optional)',
      description: 'Configure an automated schedule on Overview.',
      status: 'upcoming',
      optional: true,
      isCurrentTab: activeTab === 'overview',
      onSelect: () => onTabChange('overview'),
    },
  ];
  return (
    <SetupJourneyCard
      compact
      eyebrow="Job setup"
      title={
        stage === 'field-mapping'
          ? 'Map the fields for this sync job'
          : stage === 'pipeline'
            ? 'Finish the required sync configuration'
            : 'Run your first sync'
      }
      description={
        stage === 'field-mapping'
          ? 'Map source and destination fields, then choose at least one Match Field.'
          : stage === 'pipeline'
            ? 'Choose the destination pipeline required before running this job.'
            : 'Run a limited sync to verify records move cleanly between platforms.'
      }
      steps={steps}
      actionLabel={
        stage === 'field-mapping'
          ? 'Go to Field Mapping'
          : stage === 'pipeline'
            ? 'Configure Pipeline'
            : 'Run Limited Sync'
      }
      onContinue={stage === 'overview' ? onRun : () => onTabChange(stage)}
    />
  );
}

function JobSettings({
  job,
  project,
  projectId,
  projectPath,
  section,
  onSectionChange,
  saveName,
  saveWebhook,
  saveRetry,
  saveSkipUpdate,
}: {
  job: SuperAdminJobDetail;
  project: SuperAdminProjectDetail;
  projectId: string;
  projectPath: string;
  section: SettingsSection;
  onSectionChange: (value: string) => void;
  saveName: (name: string) => Promise<unknown>;
  saveWebhook: (enabled: boolean) => Promise<unknown>;
  saveRetry: (patch: {
    maxRetries: number;
    retryBackoffBaseSec: number;
  }) => Promise<unknown>;
  saveSkipUpdate: (skipUpdateOnMatch: boolean) => Promise<unknown>;
}) {
  const [webhookEnabled, setWebhookEnabled] = useState(
    job.hubspotWebhookEnabled,
  );
  const [webhookSaving, setWebhookSaving] = useState(false);
  useEffect(
    () => setWebhookEnabled(job.hubspotWebhookEnabled),
    [job.id, job.hubspotWebhookEnabled],
  );
  const saveWebhookSetting = async () => {
    setWebhookSaving(true);
    try {
      await saveWebhook(webhookEnabled);
      toast.success('Job updated.');
    } catch {
      toast.error('Could not update the HubSpot webhook setting.');
    } finally {
      setWebhookSaving(false);
    }
  };
  return (
    <Accordion
      type="single"
      collapsible
      value={section === 'closed' ? '' : section}
      onValueChange={(value) => onSectionChange(value || 'closed')}
      aria-label="Job settings"
    >
      <AccordionItem value="general">
        <AccordionTrigger>
          <span className="flex items-start gap-3">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Settings2 className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">General</span>
              <span className="text-muted-foreground block text-xs font-normal">
                Name, sync direction, and saved configuration.
              </span>
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          {section === 'general' && (
            <div className="space-y-4">
              <Card className="gap-0 py-0">
                <CardContent className="px-4 py-4">
                  <JobGeneralCard
                    projectId={projectId}
                    job={job}
                    onUpdated={() => undefined}
                    saveJob={saveName}
                  />
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardContent className="space-y-4 px-4 py-4">
                  <HeadingPair
                    visualLevel="card"
                    level="h3"
                    title="Sync Direction & Behavior"
                    subtitle="How this job moves records between platforms. Structural fields are locked after creation."
                  />
                  <SyncDirectionFields
                    syncDirection={job.syncDirection}
                    sourceOfTruth={
                      job.sourceOfTruth ?? project.sourcePlatformId
                    }
                    deleteHandling={job.deleteHandling}
                    hubspotWebhookEnabled={webhookEnabled}
                    syncTrigger={job.syncTrigger}
                    sourcePlatform={project.sourcePlatformId}
                    destPlatform={project.destPlatformId}
                    availablePlatforms={[
                      {
                        platformId: project.sourcePlatformId,
                        label: project.sourcePlatformId,
                      },
                      {
                        platformId: project.destPlatformId,
                        label: project.destPlatformId,
                      },
                    ]}
                    sourceConnection={undefined}
                    destConnection={undefined}
                    projectId={project.id}
                    twoWayNotice={null}
                    onSyncDirectionChange={() => undefined}
                    onSourceOfTruthChange={() => undefined}
                    onDeleteHandlingChange={() => undefined}
                    onHubspotWebhookEnabledChange={setWebhookEnabled}
                    onSyncTriggerChange={() => undefined}
                    fieldMappingLocationLabel="the Field Mapping tab"
                    readOnly
                  />
                  {job.syncDirection === 'two_way' && (
                    <Button
                      onClick={() => void saveWebhookSetting()}
                      disabled={
                        webhookSaving ||
                        webhookEnabled === job.hubspotWebhookEnabled
                      }
                    >
                      {webhookSaving ? 'Saving…' : 'Save Changes'}
                    </Button>
                  )}
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardHeader className="px-4 py-3">
                  <CardTitle>Saved configuration</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Sync direction"
                      value={job.syncDirection}
                    />
                    <DetailItem label="Sync trigger" value={job.syncTrigger} />
                    <DetailItem
                      label="Source match field"
                      value={job.idMappingSourceField}
                    />
                    <DetailItem
                      label="Destination match field"
                      value={job.idMappingDestField}
                    />
                    <DetailItem
                      label="Source of truth"
                      value={job.sourceOfTruth}
                    />
                    <DetailItem
                      label="Delete handling"
                      value={job.deleteHandling}
                    />
                    <DetailItem
                      label="HubSpot webhook"
                      value={job.hubspotWebhookEnabled ? 'Enabled' : 'Disabled'}
                    />
                    <DetailItem
                      label="Destination pipeline"
                      value={job.destPipelineId}
                    />
                    <DetailItem
                      label="Pipeline status mappings"
                      value={
                        job.statusMapping
                          ? Object.keys(job.statusMapping).length
                          : 0
                      }
                    />
                    <DetailItem
                      label="Skip updates on match"
                      value={job.skipUpdateOnMatch ? 'Yes' : 'No'}
                    />
                    <DetailItem label="Timezone" value={job.timezone} />
                    <DetailItem
                      label="Schedule mode"
                      value={job.scheduleMode}
                    />
                    <DetailItem
                      label="Schedule times"
                      value={job.scheduleTimes?.join(', ')}
                    />
                    <DetailItem
                      label="Schedule days"
                      value={job.scheduleDays?.join(', ')}
                    />
                    <DetailItem
                      label="Interval"
                      value={
                        job.intervalMinutes == null
                          ? null
                          : `${job.intervalMinutes} minutes`
                      }
                    />
                    <DetailItem
                      label="Cron expression"
                      value={job.cronExpression}
                    />
                    <DetailItem
                      label="Depends on job"
                      value={
                        job.dependsOnJobId ? (
                          <Link
                            className="text-primary hover:underline"
                            to={`${projectPath}/jobs/${job.dependsOnJobId}`}
                          >
                            {job.dependsOnJobId}
                          </Link>
                        ) : (
                          'None'
                        )
                      }
                    />
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="advanced">
        <AccordionTrigger>
          <span className="flex items-start gap-3">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <RotateCcw className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">Advanced</span>
              <span className="text-muted-foreground block text-xs font-normal">
                Retries, matched records, checkpoints, and saved rules.
              </span>
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          {section === 'advanced' && (
            <div className="space-y-4">
              <Card className="gap-0 py-0">
                <CardContent className="px-4 py-4">
                  <JobRetryCard
                    projectId={projectId}
                    job={job}
                    onUpdated={() => undefined}
                    saveJob={saveRetry}
                  />
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardContent className="px-4 py-4">
                  <JobSkipUpdateCard
                    projectId={projectId}
                    job={job}
                    onUpdated={() => undefined}
                    saveJob={saveSkipUpdate}
                  />
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardHeader className="px-4 py-3">
                  <CardTitle>Resume checkpoint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Page" value={job.checkpointPage} />
                    <DetailItem
                      label="Since"
                      value={dateLabel(job.checkpointSince)}
                    />
                    <DetailItem label="Run ID" value={job.checkpointRunId} />
                    <DetailItem
                      label="Full sync page"
                      value={job.syncAllPage}
                    />
                  </dl>
                  <p className="text-muted-foreground text-xs">
                    The next matching run may resume from these saved values.
                  </p>
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardHeader className="px-4 py-3">
                  <CardTitle>Saved advanced rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 text-sm">
                  <DetailItem
                    label="Filter logic"
                    value={job.excludeConditionLogic}
                  />
                  {[
                    ['Source filters', job.excludeConditions],
                    [
                      'Destination skip conditions',
                      job.destinationSkipConditions,
                    ],
                    ['Default values', job.defaultValues],
                    ['Pipeline status mapping', job.statusMapping],
                  ].map(([label, value]) => (
                    <details
                      key={label as string}
                      className="rounded-2xl border p-3"
                    >
                      <summary className="cursor-pointer font-medium">
                        {label as string}
                      </summary>
                      <pre className="mt-2 overflow-x-auto text-xs break-words whitespace-pre-wrap">
                        {value == null ||
                        (Array.isArray(value) && value.length === 0)
                          ? 'Not configured'
                          : JSON.stringify(value, null, 2)}
                      </pre>
                    </details>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default function OrganisationJobDetailPage() {
  const queryClient = useQueryClient();
  const {
    organisationId = '',
    projectId = '',
    jobId = '',
  } = useParams<{
    organisationId: string;
    projectId: string;
    jobId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runOpen, setRunOpen] = useState(false);
  const [scheduleToggling, setScheduleToggling] = useState(false);
  const [bullJobId, setBullJobId] = useState<string | null>(null);
  const tab: JobTab =
    searchParams.get('tab') === 'field-mapping'
      ? 'field-mapping'
      : searchParams.get('tab') === 'pipeline'
        ? 'pipeline'
        : searchParams.get('tab') === 'run-history'
          ? 'run-history'
          : searchParams.get('tab') === 'settings'
            ? 'settings'
            : 'overview';
  const section: SettingsSection =
    searchParams.get('section') === 'advanced'
      ? 'advanced'
      : searchParams.get('section') === 'closed'
        ? 'closed'
        : 'general';
  const projectPath = `/super-admin/organisations/${organisationId}/projects/${projectId}`;
  const jobQuery = useSuperAdminJobQuery(organisationId, projectId, jobId);
  const projectQuery = useSuperAdminProjectQuery(organisationId, projectId);
  const runJob = useRunSuperAdminJobMutation(organisationId, projectId, jobId);
  const setEnabled = useSetSuperAdminJobEnabledMutation(
    organisationId,
    projectId,
    jobId,
  );
  const setSyncEnabled = useSetSuperAdminJobSyncEnabledMutation(
    organisationId,
    projectId,
    jobId,
  );
  const pauseSchedule = usePauseSuperAdminJobScheduleMutation(
    organisationId,
    projectId,
    jobId,
  );
  const resumeSchedule = useResumeSuperAdminJobScheduleMutation(
    organisationId,
    projectId,
    jobId,
  );
  const updateJob = useUpdateSuperAdminJobMutation(
    organisationId,
    projectId,
    jobId,
  );
  const runStatusQuery = useSuperAdminRunStatusQuery(
    organisationId,
    projectId,
    jobId,
    bullJobId,
  );
  const historyQuery = useSuperAdminJobRunsQuery(
    organisationId,
    projectId,
    jobId,
    1,
  );

  useEffect(() => {
    if (
      runStatusQuery.data?.state === 'completed' ||
      runStatusQuery.data?.state === 'failed'
    ) {
      void jobQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: [
          'superAdmin',
          organisationId,
          'projects',
          projectId,
          'jobs',
          jobId,
          'sync-logs',
        ],
      });
    }
  }, [
    runStatusQuery.data?.state,
    jobQuery.refetch,
    queryClient,
    organisationId,
    projectId,
    jobId,
  ]);

  if (!organisationId || !projectId || !jobId) {
    return (
      <EmptyState
        icon={Workflow}
        title="Missing job address"
        description="Open this job from a selected organisation's project."
      />
    );
  }
  if (jobQuery.isLoading || projectQuery.isLoading)
    return <SkeletonList count={4} />;
  if (
    jobQuery.isError ||
    !jobQuery.data ||
    projectQuery.isError ||
    !projectQuery.data
  ) {
    return (
      <ErrorState
        title="Could not load job"
        onRetry={() => {
          void jobQuery.refetch();
          void projectQuery.refetch();
        }}
      />
    );
  }

  const job = jobQuery.data;
  const project = projectQuery.data;
  const runs = historyQuery.data?.data ?? [];
  const pipelineRequired =
    project.destPlatformId === 'hubspot' &&
    KNOWN_PIPELINE_OBJECTS.has(job.destObject.toLowerCase());
  const mappingReady = Boolean(
    job.fieldMappings?.length &&
    job.fieldMappings.some((mapping) => mapping.isMatchField),
  );
  const pipelineReady =
    !pipelineRequired ||
    Boolean(
      job.destPipelineId &&
      job.statusMapping &&
      Object.keys(job.statusMapping).length,
    );
  const submitRun = async (values: SuperAdminRunJobDto) => {
    try {
      const result = await runJob.mutateAsync(values);
      setRunOpen(false);
      setBullJobId(result.bullJobId ?? null);
      toast.success(result.message ?? 'Sync run queued.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not start sync run. Please try again.',
      );
    }
  };
  const changeEnabled = async () => {
    if (!job) return;
    try {
      await setEnabled.mutateAsync(!job.isEnabled);
      toast.success(
        job.isEnabled
          ? 'Sync Flow disabled.'
          : 'Sync Flow enabled. Its schedule remains paused until started.',
      );
      void jobQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not change the job state.',
      );
    }
  };
  const handleScheduleToggle = async (payload?: ScheduleTogglePayload) => {
    if (!job) return;
    setScheduleToggling(true);
    try {
      if (
        job.scheduleState === 'paused' ||
        job.scheduleState === 'paused_limit_reached'
      ) {
        await resumeSchedule.mutateAsync(payload?.resumeMode);
        toast.success(
          payload?.resumeMode === 'start_now'
            ? 'Schedule resumed from now — missed changes were skipped.'
            : 'Schedule resumed — catching up on missed changes.',
        );
      } else if (job.syncEnabled) {
        await pauseSchedule.mutateAsync();
        toast.success('Schedule paused. Runs will not fire until resumed.');
      } else {
        await setSyncEnabled.mutateAsync(true);
        toast.success(
          'Schedule started — sync will run per configured interval.',
        );
      }
      await jobQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not change the schedule.',
      );
    } finally {
      setScheduleToggling(false);
    }
  };
  const saveSchedule = async (
    payload: ReturnType<typeof buildScheduleUpdatePayload>,
  ) => {
    await updateJob.mutateAsync({
      ...payload,
      scheduleMode: payload.scheduleMode as
        | 'daily_time'
        | 'interval'
        | 'day_specific',
    });
    await jobQuery.refetch();
  };
  const handleTabChange = (
    value: JobDetailTabId,
    options?: {
      replace?: boolean;
      searchParams?: Record<string, string | undefined | null>;
    },
  ) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('tab', value);
        if (value !== 'settings') next.delete('section');
        if (options?.searchParams) {
          for (const [k, v] of Object.entries(options.searchParams)) {
            if (v == null) next.delete(k);
            else next.set(k, v);
          }
        }
        return next;
      },
      { replace: options?.replace },
    );

  const contextValue: JobDetailContextValue = {
    projectId,
    jobId,
    job: job as unknown as ExtJob,
    project: project as unknown as Project,
    runLogs: runs as unknown as ExtSyncRun[],
    jobFieldMappings: consolidateMappings(
      job.fieldMappings as unknown as FieldMapping[],
    ),
    hasConnection: true,
    isProductionReady: true,
    pipelineRequired,
    pipelineConfigured: pipelineReady,

    activeTab: tab as JobDetailTabId,
    patchJob: () => undefined,
    refetch: () => {
      void jobQuery.refetch();
      void historyQuery.refetch();
    },
    handleTabChange,

    activeRunLog: bullJobId
      ? {
          bullmqJobId: bullJobId,
          status:
            runStatusQuery.data?.state === 'active' ||
            runStatusQuery.data?.state === 'running'
              ? 'running'
              : runStatusQuery.data?.state === 'waiting' ||
                  runStatusQuery.data?.state === 'delayed'
                ? 'queued'
                : runStatusQuery.data?.state === 'failed'
                  ? 'failed'
                  : 'success',
        }
      : null,
    liveProgress: null,
    upgradeDialog: { open: false, message: '' },
    setUpgradeDialog: () => undefined,
    isSyncing:
      runJob.isPending ||
      runStatusQuery.data?.state === 'active' ||
      runStatusQuery.data?.state === 'running',
    running:
      job.isRunning ||
      runStatusQuery.data?.state === 'active' ||
      runStatusQuery.data?.state === 'running',
    fullResyncing: false,
    stopping: false,
    toggling: setEnabled.isPending,
    scheduleToggling,
    cancellingQueue: false,
    retryingQueue: false,
    beginTracking: async () => {
      void jobQuery.refetch();
      void historyQuery.refetch();
    },
    handleRunNow: async () => {
      await submitRun({ fullSync: false });
    },
    handleSyncAll: async (onStarted, range) => {
      onStarted?.();
      await submitRun({
        fullSync: true,
        startDate: range?.startDate,
        endDate: range?.endDate,
      });
    },
    handleScheduleToggle,
    saveSchedule,
    handleStop: async () => undefined,
    handleCancelQueue: async () => undefined,
    handleRetryQueue: async () => undefined,
    handleToggle: changeEnabled,

    highlightStatusGuide: false,
    triggerInactiveGuide: () => undefined,
    manualDialogOpen: runOpen,
    setManualDialogOpen: setRunOpen,
  };

  return (
    <JobDetailProvider value={contextValue}>
      <Tabs
        value={tab === 'pipeline' && !pipelineRequired ? 'overview' : tab}
        onValueChange={(value) => handleTabChange(value as JobDetailTabId)}
        className="gap-0"
      >
        <div className="space-y-4">
          <JobSetupJourney
            job={job}
            runs={runs}
            pipelineRequired={pipelineRequired}
            activeTab={tab}
            onTabChange={(t) => handleTabChange(t as JobDetailTabId)}
            onRun={() => {
              runJob.reset();
              setRunOpen(true);
            }}
          />
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="field-mapping">
            <OrganisationJobMappingPanel
              key={job.id}
              organisationId={organisationId}
              project={project}
              job={job}
            />
          </TabsContent>
          {pipelineRequired && (
            <TabsContent value="pipeline">
              <OrganisationJobPipelinePanel
                key={job.id}
                organisationId={organisationId}
                project={project}
                job={job}
              />
            </TabsContent>
          )}
          <TabsContent value="run-history">
            <RunHistoryTab
              projectId={project.id}
              jobId={job.id}
              refetch={() => {
                void jobQuery.refetch();
                void historyQuery.refetch();
              }}
            />
          </TabsContent>
          <TabsContent value="settings">
            <JobSettings
              job={job}
              project={project}
              projectId={projectId}
              projectPath={projectPath}
              section={section}
              onSectionChange={(value) =>
                setSearchParams((previous) => {
                  const next = new URLSearchParams(previous);
                  next.set('tab', 'settings');
                  next.set('section', value);
                  return next;
                })
              }
              saveName={(name) => updateJob.mutateAsync({ name })}
              saveWebhook={(enabled) =>
                updateJob.mutateAsync({ hubspotWebhookEnabled: enabled })
              }
              saveRetry={(patch) => updateJob.mutateAsync(patch)}
              saveSkipUpdate={(skipUpdateOnMatch) =>
                updateJob.mutateAsync({ skipUpdateOnMatch })
              }
            />
          </TabsContent>
        </div>
        {runOpen && tab !== 'overview' && (
          <StartSyncModal
            projectId={projectId}
            jobId={job.id}
            job={job as unknown as ExtJob}
            environment={
              (project.activeEnvironment as ProjectEnvironment) || undefined
            }
            sourcePlatformId={project.sourcePlatformId}
            hasBaseline={Boolean(
              job.lastSyncedAt ||
                runs.some(
                  (r) => r.status === 'completed' || r.status === 'success',
                ),
            )}
            pipelineRequired={pipelineRequired}
            pipelineConfigured={pipelineReady}
            onGoToPipeline={() => {
              setRunOpen(false);
              handleTabChange('pipeline');
            }}
            onClose={() => setRunOpen(false)}
            onRunNow={() => {
              setRunOpen(false);
              void submitRun({ fullSync: false });
            }}
            onLimitSyncStarted={() => {
              void jobQuery.refetch();
              void historyQuery.refetch();
            }}
            onLimitSyncDone={() => {
              void jobQuery.refetch();
              void historyQuery.refetch();
            }}
            onSyncAll={(range) => {
              setRunOpen(false);
              void submitRun({
                fullSync: true,
                startDate: range?.startDate,
                endDate: range?.endDate,
              });
            }}
          />
        )}
      </Tabs>
    </JobDetailProvider>
  );
}
