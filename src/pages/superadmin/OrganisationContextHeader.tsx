import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  ChevronRight,
} from 'lucide-react';
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from '@/components/platform';
import JobStatusDropdown from '@/features/jobs/components/detail/JobStatusDropdown';
import { KNOWN_PIPELINE_OBJECTS } from '@/features/jobs/types';
import ProjectStatusDropdown from '@/features/projects/components/detail/ProjectStatusDropdown';
import { cn } from '@/lib/utils';
import {
  useSetSuperAdminJobEnabledMutation,
  useSuperAdminJobQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectConnectionsQuery,
  useSuperAdminProjectQuery,
  useUpdateSuperAdminProjectMutation,
} from '@/queries/useSuperAdmin';
import type {
  SuperAdminJobDetail,
  SuperAdminProjectDetail,
  SuperAdminProjectStatus,
} from '@/types/superAdmin';

const ORGANISATION_SECTIONS = [
  { label: 'Overview', path: 'overview' },
  { label: 'Members', path: 'members' },
  { label: 'Projects', path: 'projects' },
  { label: 'Billing', path: 'billing' },
  { label: 'Activity', path: 'activity' },
  { label: 'Support', path: 'support' },
] as const;

interface SectionLink {
  label: string;
  to: string;
  active: boolean;
}

const PROJECT_STATUSES: readonly SuperAdminProjectStatus[] = [
  'draft',
  'active',
  'paused',
  'error',
];

function ProjectHeaderStatusControl({
  organisationId,
  projectId,
  project,
}: {
  organisationId: string;
  projectId: string;
  project: SuperAdminProjectDetail;
}) {
  const update = useUpdateSuperAdminProjectMutation(organisationId, projectId);

  const changeStatus = async (status: SuperAdminProjectStatus) => {
    if (status === project.status || update.isPending) return;
    try {
      await update.mutateAsync({ status });
      toast.success(`Project status set to ${status}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not update project status. Please try again.',
      );
    }
  };

  return (
    <ProjectStatusDropdown
      current={project.status}
      options={PROJECT_STATUSES}
      onSelect={(status) => void changeStatus(status)}
      disabled={update.isPending}
    />
  );
}

function JobHeaderStatusControl({
  organisationId,
  projectId,
  job,
  project,
}: {
  organisationId: string;
  projectId: string;
  job: SuperAdminJobDetail;
  project: SuperAdminProjectDetail;
}) {
  const connections = useSuperAdminProjectConnectionsQuery(
    organisationId,
    projectId,
  );
  const setEnabled = useSetSuperAdminJobEnabledMutation(
    organisationId,
    projectId,
    job.id,
  );
  const hasConnection = [
    project.sourcePlatformId,
    project.destPlatformId,
  ].every((platform) =>
    connections.data?.some(
      (connection) =>
        connection.platformId === platform &&
        connection.environment === project.activeEnvironment &&
        connection.status === 'connected',
    ),
  );
  const canActivate = Boolean(
    job.fieldMappings?.some((mapping) => mapping.isMatchField) &&
    hasConnection &&
    project.status === 'active',
  );

  const changeEnabled = async () => {
    try {
      await setEnabled.mutateAsync(!job.isEnabled);
      toast.success(
        job.isEnabled ? 'Sync Flow disabled.' : 'Sync Flow enabled.',
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not change the job state.',
      );
    }
  };

  return (
    <JobStatusDropdown
      isActive={job.isEnabled}
      canActivate={canActivate}
      hasConnection={hasConnection}
      fieldMappingCount={job.fieldMappings?.length ?? 0}
      toggling={setEnabled.isPending}
      onToggle={() => void changeEnabled()}
      isSyncing={job.isRunning}
      canDeactivate={!job.isRunning}
    />
  );
}

/** One context surface for every level of the selected-organisation route tree. */
export default function OrganisationContextHeader() {
  const { organisationId, projectId, jobId } = useParams<{
    organisationId: string;
    projectId: string;
    jobId: string;
  }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sectionsRef = useRef<HTMLElement>(null);
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectQuery = useSuperAdminProjectQuery(
    organisationId ?? '',
    projectId,
  );
  const jobQuery = useSuperAdminJobQuery(
    organisationId ?? '',
    projectId ?? '',
    jobId,
  );

  const org = orgQuery.data;
  const project = projectQuery.data;
  const job = jobQuery.data;
  const level = jobId ? 'job' : projectId ? 'project' : 'organisation';
  const organisationPath = `/super-admin/organisations/${organisationId}`;
  const projectPath = `${organisationPath}/projects/${projectId ?? ''}`;
  const jobPath = `${projectPath}/jobs/${jobId ?? ''}`;
  const projectSection = location.pathname.slice(projectPath.length);
  const projectTab =
    searchParams.get('tab') === 'settings' || projectSection.length > 0
      ? 'settings'
      : searchParams.get('tab') === 'connections'
        ? 'connections'
        : 'sync-rules';
  const pipelineRequired =
    project?.destPlatformId === 'hubspot' &&
    Boolean(job && KNOWN_PIPELINE_OBJECTS.has(job.destObject.toLowerCase()));
  const requestedJobTab = searchParams.get('tab');
  const jobTab =
    requestedJobTab === 'field-mapping' ||
    requestedJobTab === 'run-history' ||
    requestedJobTab === 'settings' ||
    (requestedJobTab === 'pipeline' && pipelineRequired)
      ? requestedJobTab
      : 'overview';

  const jobTabLink = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    if (tab !== 'settings') params.delete('section');
    return `${jobPath}?${params.toString()}`;
  };

  const sections: SectionLink[] =
    level === 'organisation'
      ? ORGANISATION_SECTIONS.map(({ label, path }) => ({
          label,
          to: `${organisationPath}/${path}`,
          active:
            location.pathname === `${organisationPath}/${path}` ||
            (path === 'overview' && location.pathname === organisationPath),
        }))
      : level === 'project'
        ? [
            {
              label: 'Connections',
              to: `${projectPath}?tab=connections`,
              active: projectTab === 'connections',
            },
            {
              label: 'Sync Flows',
              to: `${projectPath}?tab=sync-rules`,
              active: projectTab === 'sync-rules',
            },
            {
              label: 'Settings',
              to: `${projectPath}?tab=settings`,
              active: projectTab === 'settings',
            },
          ]
        : [
            {
              label: 'Overview',
              to: jobTabLink('overview'),
              active: jobTab === 'overview',
            },
            {
              label: 'Field Mapping',
              to: jobTabLink('field-mapping'),
              active: jobTab === 'field-mapping',
            },
            ...(pipelineRequired
              ? [
                  {
                    label: 'Pipeline',
                    to: jobTabLink('pipeline'),
                    active: jobTab === 'pipeline',
                  },
                ]
              : []),
            {
              label: 'Sync History',
              to: jobTabLink('run-history'),
              active: jobTab === 'run-history',
            },
            {
              label: 'Settings',
              to: jobTabLink('settings'),
              active: jobTab === 'settings',
            },
          ];

  const title =
    level === 'job'
      ? (job?.name ?? (jobQuery.isError ? 'Job unavailable' : 'Loading job…'))
      : level === 'project'
        ? (project?.name ??
          (projectQuery.isError ? 'Project unavailable' : 'Loading project…'))
        : (org?.name ??
          (orgQuery.isError
            ? 'Organisation unavailable'
            : 'Loading organisation…'));
  const details =
    level === 'job'
      ? job
        ? `${job.sourceObject} → ${job.destObject} · ${project?.activeEnvironment ?? 'Environment unavailable'} · ${job.lastSyncedAt ? 'Last synced' : 'Not synced yet'}`
        : 'Sync flow in this project'
      : level === 'project'
        ? project
          ? `${project.sourcePlatformId} → ${project.destPlatformId} · ${project.activeEnvironment} · ${project.lastSyncedAt ? 'Last synced' : 'Not synced yet'}`
          : 'Project in this organisation'
        : org
          ? `${org.slug} · ${org.plan.name} · ${org.plan.subscriptionStatus}${org.paymentHoldActive ? ' · Payment hold active' : ''}`
          : 'Selected organisation workspace';
  const failedQuery =
    level === 'job' && jobQuery.isError
      ? jobQuery
      : level !== 'organisation' && projectQuery.isError
        ? projectQuery
        : orgQuery.isError
          ? orgQuery
          : null;

  useEffect(() => {
    const active = sectionsRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [location.pathname, location.search, pipelineRequired]);

  if (!organisationId) return null;

  return (
    <section
      data-layout-surface="outer"
      className="bg-card border-border/70 overflow-hidden rounded-3xl border"
      aria-label="Current workspace"
    >
      <div className="px-4 pt-3 sm:px-5 sm:pt-4">
        <nav
          aria-label="Location"
          className="text-muted-foreground text-xs sm:text-sm"
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                className="hover:text-foreground rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                to="/super-admin/organisations"
              >
                Organisations
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              {level === 'organisation' ? (
                <span
                  className="text-foreground font-medium"
                  aria-current="page"
                >
                  {title}
                </span>
              ) : (
                <Link
                  className="hover:text-foreground rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  to={`${organisationPath}/overview`}
                >
                  {org?.name ?? 'Selected organisation'}
                </Link>
              )}
            </li>
            {projectId && (
              <>
                <li
                  aria-hidden="true"
                  className={
                    level === 'project' ? 'hidden sm:block' : undefined
                  }
                >
                  <ChevronRight className="size-3.5" />
                </li>
                <li
                  className={
                    level === 'project' ? 'hidden sm:list-item' : undefined
                  }
                >
                  {level === 'project' ? (
                    <span
                      className="text-foreground font-medium"
                      aria-current="page"
                    >
                      {title}
                    </span>
                  ) : (
                    <Link
                      className="hover:text-foreground rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                      to={`${projectPath}?tab=sync-rules`}
                    >
                      {project?.name ?? 'Project'}
                    </Link>
                  )}
                </li>
              </>
            )}
            {jobId && (
              <>
                <li aria-hidden="true" className="hidden sm:block">
                  <ChevronRight className="size-3.5" />
                </li>
                <li
                  className="text-foreground hidden font-medium sm:list-item"
                  aria-current="page"
                >
                  {title}
                </li>
              </>
            )}
          </ol>
        </nav>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            {project ? (
              <div
                className="flex shrink-0 items-center gap-1.5"
                aria-hidden="true"
              >
                <PlatformIcon
                  platformId={project.sourcePlatformId}
                  variant="avatar"
                  size="3xl"
                  className="size-9 rounded-xl sm:size-11"
                />
                {(level === 'job' && job ? job.syncDirection === 'two_way' : project.syncMode === 'two_way') ? (
                  <ArrowLeftRight className="text-muted-foreground size-4" />
                ) : (
                  <ArrowRight className="text-muted-foreground size-4" />
                )}
                <PlatformIcon
                  platformId={project.destPlatformId}
                  variant="avatar"
                  size="3xl"
                  className="size-9 rounded-xl sm:size-11"
                />
              </div>
            ) : (
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="min-w-0 text-lg leading-tight font-semibold tracking-tight wrap-break-word sm:text-xl">
                  {title}
                </h1>
                {level === 'organisation' && org && (
                  <StatusBadge status={org.status} label={org.status} tone={org.status === 'pending' ? 'info' : undefined} className="capitalize" />
                )}
                {level === 'project' && project && projectId && (
                  <ProjectHeaderStatusControl
                    organisationId={organisationId}
                    projectId={projectId}
                    project={project}
                  />
                )}
                {level === 'job' && job && project && projectId && (
                  <JobHeaderStatusControl
                    organisationId={organisationId}
                    projectId={projectId}
                    job={job}
                    project={project}
                  />
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm wrap-break-word">
                {details}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">
            {project && (
              <>
                {(level === 'job' && job
                  ? job.syncDirection
                  : project.syncMode) && (
                  <StatusBadge
                    status={
                      level === 'job' && job
                        ? job.syncDirection
                        : project.syncMode
                    }
                    size="lg"
                  />
                )}
                {project.activeEnvironment && (
                  <StatusBadge
                    status={project.activeEnvironment}
                    label={
                      project.activeEnvironment === 'sandbox'
                        ? 'Sandbox (Test Mode)'
                        : 'Production (Live)'
                    }
                    title={
                      project.activeEnvironment === 'sandbox'
                        ? 'Operating in Sandbox — Live customer data is not affected'
                        : 'Live Production Sync active'
                    }
                    size="sm"
                  />
                )}
              </>
            )}
            {failedQuery && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void failedQuery.refetch()}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>

      <nav
        ref={sectionsRef}
        aria-label={`${level === 'job' ? 'Sync flow' : level === 'project' ? 'Project' : 'Organisation'} sections`}
        className="mt-2 [scrollbar-width:none] overflow-x-auto px-3 sm:px-4 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max items-end gap-3 sm:gap-4">
          {sections.map((section) => (
            <Link
              key={section.label}
              to={section.to}
              aria-current={section.active ? 'page' : undefined}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 items-center justify-center border-b-[3px] border-transparent px-1.5 pt-2 pb-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                section.active &&
                  'text-foreground border-[var(--brand-orange)] font-semibold',
              )}
            >
              {section.label}
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
