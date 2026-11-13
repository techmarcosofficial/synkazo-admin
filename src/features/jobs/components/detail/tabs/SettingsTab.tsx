import {
  CalendarClock,
  GitMerge,
  History,
  RotateCcw,
  Settings2,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useJobDetailContext } from '../context';
import {
  DataformaCustomerCursorCard,
  JobDangerZoneCard,
  JobGeneralCard,
  JobRetryCard,
  JobScheduleSettings,
  JobScheduleSettingsHeader,
  JobSkipUpdateCard,
  JobSyncDirectionCard,
} from '../settings';

import { jobsApi } from '@/api/jobs';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const RunHistoryTab = lazy(() => import('./RunHistoryTab'));
const ConflictsTab = lazy(() => import('./ConflictsTab'));
const WebhookEventsTab = lazy(() => import('./WebhookEventsTab'));

export type JobSettingsSectionId =
  | 'general'
  | 'schedule'
  | 'advanced'
  | 'sync-history'
  | 'conflicts'
  | 'webhook-events';

interface JobSettingsSection {
  id: JobSettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'settings' | 'activity';
  /** Only two-way flows have conflicts and HubSpot webhook events. */
  twoWayOnly?: boolean;
  /** The section renders its own heading. */
  ownHeading?: boolean;
}

const SECTIONS: JobSettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Job identity, objects, sync direction, and danger zone.',
    icon: Settings2,
    group: 'settings',
  },
  {
    id: 'schedule',
    label: 'Scheduler',
    description: 'Automated sync schedule and interval settings for this sync flow.',
    icon: CalendarClock,
    group: 'settings',
    ownHeading: true,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Retry behavior, matched records, and saved progress.',
    icon: RotateCcw,
    group: 'settings',
  },
  {
    id: 'sync-history',
    label: 'Sync History',
    description: 'Every sync run with its page and record details.',
    icon: History,
    group: 'activity',
    ownHeading: true,
  },
  {
    id: 'conflicts',
    label: 'Conflicts',
    description:
      'Fields changed on both platforms and records waiting on a parent.',
    icon: GitMerge,
    group: 'activity',
    twoWayOnly: true,
  },
  {
    id: 'webhook-events',
    label: 'Webhook Events',
    description: 'Changes HubSpot reported and what Synkazo did with each one.',
    icon: Webhook,
    group: 'activity',
    twoWayOnly: true,
  },
];

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function formatCheckpointDate(value?: string | null) {
  if (!value) return 'Not available';
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function CheckpointInformation() {
  const { job } = useJobDetailContext();
  const hasCheckpoint =
    job.checkpointPage != null ||
    Boolean(job.checkpointSince) ||
    job.syncAllPage != null;

  return (
    <section aria-labelledby="job-checkpoint-title">
      <HeadingPair
        visualLevel="card"
        level="h3"
        titleId="job-checkpoint-title"
        title="Sync Progress Bookmark (Checkpoint)"
        subtitle="Saved progress used to continue an interrupted sync without starting over from scratch."
        className="mb-4"
      />

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">
            Current Bookmark (Page)
          </dt>
          <dd className="mt-1 text-sm font-medium">
            {job.checkpointPage != null
              ? `Page ${job.checkpointPage}`
              : 'No saved page'}
          </dd>
        </div>
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">Bookmark Timestamp</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatCheckpointDate(job.checkpointSince)}
          </dd>
        </div>
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">
            Full Resync Bookmark
          </dt>
          <dd className="mt-1 text-sm font-medium">
            {job.syncAllPage != null
              ? `Page ${job.syncAllPage}`
              : 'No saved page'}
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground mt-3 text-xs">
        {hasCheckpoint
          ? 'This job will use the saved progress the next time the matching sync resumes.'
          : 'There is no interrupted sync waiting to resume.'}
      </p>
    </section>
  );
}

export default function SettingsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId, job, project, patchJob } = useJobDetailContext();
  const { hasPermission } = useSynkazoAuth();
  const canEditJob = hasPermission('job.edit');
  const twoWay = job.syncDirection === 'two_way';
  const sections = SECTIONS.filter(
    (section) =>
      (!section.twoWayOnly || twoWay) &&
      (section.group === 'activity' || canEditJob),
  );
  const requestedSection = searchParams.get('section');
  const normalizedSection =
    requestedSection === 'execution-recovery' ? 'advanced' : requestedSection;
  const activeSection =
    sections.find((section) => section.id === normalizedSection) ?? sections[0];
  const activeSectionId = activeSection.id;
  const showDataformaCustomerCursor =
    project?.sourcePlatformId === 'dataforma' &&
    job.sourceObject === 'customers';

  // A run selected in one section doesn't carry over to another.
  const sectionParams = (id: JobSettingsSectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', id);
    next.delete('runId');
    return next;
  };
  const sectionHref = (id: JobSettingsSectionId) =>
    `?${sectionParams(id).toString()}`;
  const handleSectionChange = (id: JobSettingsSectionId) =>
    setSearchParams(sectionParams(id));

  const handleDelete = async () => {
    try {
      await jobsApi.deleteJob(projectId, job.id);
      showToast.success('Job deleted.');
    } catch {
      showToast.error('Something went wrong. Please try again.');
      throw new Error('Failed to delete job');
    }
    navigate(`/projects/${projectId}`);
  };

  let sectionBody;
  if (activeSectionId === 'general') {
    sectionBody = (
      <div className="divide-border divide-y">
        <div className="pb-6">
          <JobGeneralCard
            projectId={projectId}
            job={job}
            onUpdated={patchJob}
          />
        </div>
        <div className="py-6">
          <JobSyncDirectionCard />
        </div>
        <div className="pt-6">
          <JobDangerZoneCard onDelete={handleDelete} />
        </div>
      </div>
    );
  } else if (activeSectionId === 'schedule') {
    sectionBody = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <JobScheduleSettingsHeader />
        </div>
        <JobScheduleSettings />
      </div>
    );
  } else if (activeSectionId === 'sync-history') {
    sectionBody = <RunHistoryTab />;
  } else if (activeSectionId === 'conflicts') {
    sectionBody = <ConflictsTab />;
  } else if (activeSectionId === 'webhook-events') {
    sectionBody = <WebhookEventsTab />;
  } else {
    sectionBody = (
      <div className="divide-border divide-y">
        <div className="pb-6">
          <JobRetryCard projectId={projectId} job={job} onUpdated={patchJob} />
        </div>
        <div className="py-6">
          <JobSkipUpdateCard
            projectId={projectId}
            job={job}
            onUpdated={patchJob}
          />
        </div>
        <div className="py-6">
          <CheckpointInformation />
        </div>
        {showDataformaCustomerCursor && (
          <div className="pt-6">
            <DataformaCustomerCursorCard
              projectId={projectId}
              job={job}
              onUpdated={patchJob}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start" aria-label="Job settings">
        <Card size="sm" className="gap-0 py-0">
          <CardHeader className="px-3.5 py-3">
            <CardTitle>Job settings</CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 pb-2.5">
            <div className="space-y-2 lg:hidden">
              <label
                htmlFor="job-settings-section"
                className="text-sm font-medium"
              >
                Settings section
              </label>
              <Select
                value={activeSectionId}
                onValueChange={(value) =>
                  handleSectionChange(value as JobSettingsSectionId)
                }
              >
                <SelectTrigger
                  id="job-settings-section"
                  className="w-full"
                  aria-label="Settings section"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <SelectItem key={section.id} value={section.id}>
                        <Icon />
                        {section.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <nav className="hidden space-y-1 lg:block">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const active = section.id === activeSectionId;
                const startsActivity =
                  section.group === 'activity' &&
                  sections[index - 1]?.group !== 'activity';
                return (
                  <div key={section.id}>
                    {startsActivity && (
                      <p
                        className={cn(
                          'text-muted-foreground px-2.5 pb-1 text-[11px] font-medium tracking-wide uppercase',
                          index > 0 && 'border-border mt-2 border-t pt-3',
                        )}
                      >
                        Activity
                      </p>
                    )}
                    <Button
                      asChild
                      variant={active ? 'secondary' : 'ghost'}
                      className="h-8 w-full justify-start px-2.5 text-xs"
                    >
                      <Link
                        to={sectionHref(section.id)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {section.label}
                        </span>
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      <div
        className="min-w-0 space-y-4"
        aria-labelledby={
          activeSection.ownHeading ? undefined : 'job-settings-section-title'
        }
        aria-label={activeSection.ownHeading ? activeSection.label : undefined}
      >
        {!activeSection.ownHeading && (
          <div className="px-1 py-1">
            <HeadingPair
              titleId="job-settings-section-title"
              title={activeSection.label}
              subtitle={activeSection.description}
            />
          </div>
        )}
        <Suspense fallback={<SectionSkeleton />}>
          <div>{sectionBody}</div>
        </Suspense>
      </div>
    </div>
  );
}
