import { format, formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Database,
  History,
  Play,
  RotateCcw,
  Settings2,
  Timer,
  Workflow,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import RunJobDialog, { type RunJobDialogValues } from './projects/RunJobDialog';
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
import JobSummaryMetric from '@/features/jobs/components/detail/JobSummaryMetric';
import JobGeneralCard from '@/features/jobs/components/detail/settings/JobGeneralCard';
import JobRetryCard from '@/features/jobs/components/detail/settings/JobRetryCard';
import JobSkipUpdateCard from '@/features/jobs/components/detail/settings/JobSkipUpdateCard';
import SyncDirectionFields from '@/features/jobs/components/SyncDirectionFields';
import JobScheduleModal from '@/features/jobs/components/schedule/JobScheduleModal';
import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import { KNOWN_PIPELINE_OBJECTS } from '@/features/jobs/types';
import { formatDurationMs } from '@/features/projects/lib/syncJobSummary';
import {
  useSuperAdminJobQuery,
  useSuperAdminJobRunsQuery,
  useSuperAdminProjectQuery,
  useRunSuperAdminJobMutation,
  useSuperAdminRunStatusQuery,
  useSetSuperAdminJobEnabledMutation,
  useSetSuperAdminJobSyncEnabledMutation,
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

function JobOverview({
  job,
  runAction,
  runStatus,
  runs,
}: {
  job: SuperAdminJobDetail;
  runAction: ReactNode;
  runStatus: ReactNode;
  runs: SuperAdminJobRunListItem[];
}) {
  const failures = job.recentFailures ?? [];
  const schedule =
    job.scheduleMode === 'interval' && job.intervalMinutes != null
      ? `Every ${job.intervalMinutes} minutes`
      : job.scheduleMode === 'daily_time' && job.scheduleTimes?.length
        ? `Daily at ${job.scheduleTimes.join(', ')}`
        : job.scheduleMode === 'day_specific' && job.scheduleTimes?.length
          ? `${job.scheduleTimes.join(', ')} on selected days`
          : job.cronExpression || 'Not configured';
  const durations = runs
    .map((run) => run.durationMs)
    .filter((duration): duration is number => duration != null);
  const averageDuration = durations.length
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Sync overview</h2>
          <p className="text-muted-foreground text-sm">
            Current job and schedule state.
          </p>
        </div>
        {runAction}
      </div>
      {runStatus}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <JobSummaryMetric
          icon={Database}
          label="Total records synced"
          value={(job.recordsSynced ?? 0).toLocaleString()}
          description="Across all executions"
        />
        <JobSummaryMetric
          icon={History}
          label="Last run"
          value={
            job.lastSyncedAt
              ? formatDistanceToNow(new Date(job.lastSyncedAt), {
                  addSuffix: true,
                })
              : 'Never'
          }
          description={
            job.lastSyncedAt
              ? 'Previous sync execution'
              : 'No runs recorded yet'
          }
        />
        <JobSummaryMetric
          icon={Play}
          label="Next run"
          value={
            job.syncEnabled && job.nextRunAt
              ? dateLabel(job.nextRunAt)
              : job.syncEnabled
                ? 'Pending'
                : 'Paused'
          }
          description={
            job.syncEnabled ? 'Current scheduled time' : 'Schedule is paused'
          }
        />
        <JobSummaryMetric
          icon={CalendarClock}
          label="Schedule at"
          value={schedule}
          description={
            job.scheduleMode || job.cronExpression
              ? 'Current schedule'
              : 'Configure a schedule'
          }
        />
        <JobSummaryMetric
          icon={Timer}
          label="Avg duration"
          value={
            averageDuration == null ? '—' : formatDurationMs(averageDuration)
          }
          description="Based on recent runs"
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-3">
          <CardTitle>Recent failed runs</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {failures.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No recent failed runs.
            </p>
          ) : (
            <ul className="divide-y rounded-3xl border">
              {failures.map((failure) => (
                <li
                  key={failure.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {dateLabel(failure.startedAt)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Run {failure.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {failure.failedCount} failed · {failure.totalFetched}{' '}
                      fetched
                    </span>
                <StatusBadge status={failure.status} label={failure.status} tone="danger" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [bullJobId, setBullJobId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
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
    historyPage,
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
  const pipelineRequired =
    project.destPlatformId === 'hubspot' &&
    KNOWN_PIPELINE_OBJECTS.has(job.destObject.toLowerCase());
  const submitRun = async (values: RunJobDialogValues) => {
    try {
      const result = await runJob.mutateAsync(values);
      setRunOpen(false);
      setBullJobId(result.bullJobId ?? null);
      toast.success(result.message ?? 'Sync run queued.');
    } catch {
      // The dialog keeps the server error visible for correction.
    }
  };
  const changeEnabled = async () => {
    try {
      await setEnabled.mutateAsync(!job.isEnabled);
      toast.success(
        job.isEnabled
          ? 'Sync Flow disabled.'
          : 'Sync Flow enabled. Its schedule remains paused until started.',
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not change the job state.',
      );
    }
  };
  const changeSchedule = async () => {
    try {
      await setSyncEnabled.mutateAsync(!job.syncEnabled);
      toast.success(job.syncEnabled ? 'Schedule paused.' : 'Schedule started.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not change the schedule.',
      );
    }
  };
  const goToTab = (value: JobTab) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', value);
      if (value !== 'settings') next.delete('section');
      return next;
    });

  return (
    <Tabs
      value={tab === 'pipeline' && !pipelineRequired ? 'overview' : tab}
      onValueChange={(value) => goToTab(value as JobTab)}
      className="gap-0"
    >
      <div className="space-y-4">
        <JobSetupJourney
          job={job}
          runs={historyQuery.data?.data ?? []}
          pipelineRequired={pipelineRequired}
          activeTab={tab}
          onTabChange={goToTab}
          onRun={() => {
            runJob.reset();
            setRunOpen(true);
          }}
        />
        <TabsContent value="overview">
          <JobOverview
            job={job}
            runs={historyQuery.data?.data ?? []}
            runAction={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setScheduleOpen(true)}>
                  <CalendarClock /> Configure schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={changeEnabled}
                  disabled={
                    setEnabled.isPending ||
                    setSyncEnabled.isPending ||
                    job.isRunning
                  }
                >
                  {job.isEnabled ? 'Disable flow' : 'Enable flow'}
                </Button>
                {job.isEnabled && (
                  <Button
                    variant="outline"
                    onClick={changeSchedule}
                    disabled={
                      setSyncEnabled.isPending ||
                      setEnabled.isPending ||
                      job.isRunning
                    }
                  >
                    {job.syncEnabled ? 'Pause schedule' : 'Start schedule'}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    runJob.reset();
                    setRunOpen(true);
                  }}
                  disabled={runJob.isPending || job.isRunning}
                >
                  <Play /> Run now
                </Button>
              </div>
            }
            runStatus={
              bullJobId ? (
                <div
                  className="bg-muted/40 rounded-2xl border p-3 text-sm"
                  role="status"
                >
                  Run {bullJobId}:{' '}
                  {runStatusQuery.isError
                    ? 'Status unavailable'
                    : (runStatusQuery.data?.state ?? 'Checking status')}
                </div>
              ) : null
            }
          />
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
          <Card className="gap-0 py-0">
            <CardHeader className="px-4 py-3">
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {historyQuery.isLoading ? (
                <SkeletonList count={3} />
              ) : historyQuery.isError ? (
                <ErrorState
                  title="Could not load sync history"
                  onRetry={() => historyQuery.refetch()}
                />
              ) : !historyQuery.data?.data.length ? (
                <EmptyState
                  icon={History}
                  title="No runs yet"
                  description="This Sync Flow has no recorded runs."
                />
              ) : (
                <>
                  <ul className="divide-y rounded-3xl border">
                    {historyQuery.data.data.map((run) => (
                      <li
                        key={run.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {dateLabel(run.startedAt)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {run.triggeredBy} · {run.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-muted-foreground">
                            {run.createdCount} created · {run.updatedCount}{' '}
                            updated · {run.skippedCount} skipped ·{' '}
                            {run.failedCount} failed
                          </span>
                          <StatusBadge status={run.executionStatus || run.status} label={run.executionStatus || run.status} tone={run.failedCount ? 'danger' : undefined} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Page {historyPage} · {historyQuery.data.total} runs
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage((page) => page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          historyPage * historyQuery.data.limit >=
                          historyQuery.data.total
                        }
                        onClick={() => setHistoryPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
      <RunJobDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        jobName={job.name}
        isSubmitting={runJob.isPending}
        errorMessage={
          runJob.isError
            ? 'Could not start this run. Check the selected job and try again.'
            : null
        }
        onSubmit={submitRun}
      />
      <JobScheduleModal
        projectId={projectId}
        jobId={jobId}
        job={job}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        skipPriorityQueue
        minIntervalMinutesOverride={1}
        saveSchedule={(payload) =>
          updateJob.mutateAsync({
            ...payload,
            scheduleMode: payload.scheduleMode as
              'daily_time' | 'interval' | 'day_specific',
          })
        }
      />
    </Tabs>
  );
}
