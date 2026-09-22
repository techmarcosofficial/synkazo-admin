import {
  CalendarClock,
  RotateCcw,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';

type JobSettingsSectionId = 'general' | 'schedule' | 'execution-recovery';

interface JobSettingsSection {
  id: JobSettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: JobSettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Job identity, objects, sync direction, and behavior.',
    icon: Settings2,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    description: 'Control when this job runs automatically.',
    icon: CalendarClock,
  },
  {
    id: 'execution-recovery',
    label: 'Execution & Recovery',
    description: 'Retry behavior, matched records, and saved progress.',
    icon: RotateCcw,
  },
];

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
      <h3 id="job-checkpoint-title" className="font-semibold">
        Resume &amp; Checkpoint
      </h3>
      <p className="text-muted-foreground mb-4 text-xs">
        Saved progress used to continue an interrupted sync without starting
        over.
      </p>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">Sync page</dt>
          <dd className="mt-1 text-sm font-medium">
            {job.checkpointPage != null
              ? `Page ${job.checkpointPage}`
              : 'No saved page'}
          </dd>
        </div>
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">Checkpoint date</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatCheckpointDate(job.checkpointSince)}
          </dd>
        </div>
        <div className="bg-muted/50 rounded-3xl border px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">Full resync page</dt>
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
  const requestedSection = searchParams.get('section');
  const activeSectionId: JobSettingsSectionId = SECTIONS.some(
    (section) => section.id === requestedSection,
  )
    ? (requestedSection as JobSettingsSectionId)
    : 'general';
  const activeSection = SECTIONS.find(
    (section) => section.id === activeSectionId,
  )!;
  const showDataformaCustomerCursor =
    project?.sourcePlatformId === 'dataforma' &&
    job.sourceObject === 'customers';

  const sectionHref = (id: JobSettingsSectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', id);
    return `?${next.toString()}`;
  };

  const handleSectionChange = (id: JobSettingsSectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', id);
    setSearchParams(next);
  };

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
        <div className="pt-6">
          <JobSyncDirectionCard />
        </div>
      </div>
    );
  } else if (activeSectionId === 'schedule') {
    sectionBody = <JobScheduleSettings />;
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
          <div className="py-6">
            <DataformaCustomerCursorCard
              projectId={projectId}
              job={job}
              onUpdated={patchJob}
            />
          </div>
        )}
        <div className="pt-6">
          <JobDangerZoneCard onDelete={handleDelete} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="min-w-0" aria-label="Job settings">
        <Card
          size="sm"
          className="top-[calc(var(--detail-sticky-top)+var(--detail-header-height)+(--spacing(4)))] gap-0 py-0 lg:sticky"
        >
          <CardHeader className="px-3.5 py-3">
            <CardTitle className="text-sm font-semibold">
              Job settings
            </CardTitle>
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
                  {SECTIONS.map((section) => {
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
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSectionId;
                return (
                  <Button
                    key={section.id}
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
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      <Card
        className="min-w-0 gap-0 py-0"
        aria-labelledby="job-settings-section-title"
      >
        <CardHeader className="gap-0 px-4 py-3">
          {activeSectionId === 'schedule' ? (
            <JobScheduleSettingsHeader />
          ) : (
            <>
              <h2
                id="job-settings-section-title"
                className="font-heading text-lg font-semibold tracking-tight"
              >
                {activeSection.label}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {activeSection.description}
              </p>
            </>
          )}
        </CardHeader>
        <CardContent className="px-3.5 pt-2.5 pb-3.5 sm:px-4 sm:pb-4">
          {sectionBody}
        </CardContent>
      </Card>
    </div>
  );
}
