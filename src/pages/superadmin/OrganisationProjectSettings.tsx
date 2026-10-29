import {
  Archive,
  CalendarClock,
  Layers3,
  Link2,
  Settings2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import type { ProjectArchiveImpact } from '@/api/projects';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import ProjectSettingsNavigation from '@/features/projects/components/detail/ProjectSettingsNavigation';
import { useUpdateSuperAdminProjectMutation } from '@/queries/useSuperAdmin';
import type { SuperAdminProjectDetail } from '@/types/superAdmin';

const Associations = lazy(() =>
  import('./associations/OrganisationProjectAssociationsPage').then(
    (module) => ({
      default: module.OrganisationProjectAssociationsPanel,
    }),
  ),
);
const Migration = lazy(() =>
  import('./migration/OrganisationProjectMigrationPage').then((module) => ({
    default: module.OrganisationProjectMigrationPanel,
  })),
);
const Scheduler = lazy(() => import('./OrganisationProjectScheduler'));

type Section = 'general' | 'schedule' | 'associations' | 'environments';
const SECTIONS: {
  id: Section;
  label: string;
  description: string;
  icon: typeof Settings2;
}[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Project identity and support operations.',
    icon: Settings2,
  },
  {
    id: 'schedule',
    label: 'Bulk Scheduler',
    description: 'Manage schedules of all sync flows.',
    icon: CalendarClock,
  },
  {
    id: 'associations',
    label: 'Associations',
    description: 'Rules and pending relationships between synced records.',
    icon: Link2,
  },
  {
    id: 'environments',
    label: 'Environments',
    description: 'Compare and transfer configuration between environments.',
    icon: Layers3,
  },
];

function getActiveSection(params: URLSearchParams): Section {
  const requested = params.get('section');
  if (!requested) return 'general';
  const first = requested.split(',')[0];
  if (
    first === 'schedule' ||
    first === 'associations' ||
    first === 'environments' ||
    first === 'general'
  ) {
    return first;
  }
  return 'general';
}

function GeneralSettings({
  organisationId,
  project,
  onHold,
  onResume,
  operationPending,
}: {
  organisationId: string;
  project: SuperAdminProjectDetail;
  onHold: () => void;
  onResume: () => void;
  operationPending: boolean;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [archiveImpact, setArchiveImpact] =
    useState<ProjectArchiveImpact | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const update = useUpdateSuperAdminProjectMutation(organisationId, project.id);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
  }, [project.id, project.name, project.description]);

  useEffect(() => {
    setArchiveImpact(null);
    setArchiveError(null);
    setArchiveOpen(false);
  }, [project.id, project.name]);

  const changed =
    name.trim() !== project.name || description !== (project.description ?? '');
  const validName = name.trim().length >= 2 && name.trim().length <= 100;
  const validDescription = description.length <= 500;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!validName || !validDescription || !changed) return;
    try {
      await update.mutateAsync({ name: name.trim(), description });
      toast.success('Project updated.');
    } catch {
      toast.error('Could not update the project.');
    }
  };

  const reviewArchive = async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      setArchiveImpact(
        await superAdminOperationsApi.getProjectArchiveImpact(
          organisationId,
          project.id,
        ),
      );
    } catch {
      setArchiveError('Could not load the project archive impact.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const archive = async ({ reason }: { reason: string }) => {
    if (!archiveImpact || archivePending) return;
    setArchivePending(true);
    setArchiveError(null);
    try {
      await superAdminOperationsApi.archiveProject(
        organisationId,
        project.id,
        project.name,
        reason,
      );
      toast.success('Project archived.');
      navigate(`/super-admin/organisations/${organisationId}/projects`);
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } } };
      setArchiveError(
        response.response?.data?.message ?? 'Could not archive this project.',
      );
    } finally {
      setArchivePending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
          <div>
            <CardTitle>Project information</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Update the display name and description for this project.
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {project.syncMode.replace(/_/g, ' ')}
          </Badge>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sa-project-name">Project name</Label>
              <Input
                id="sa-project-name"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
              {!validName && (
                <p className="text-destructive text-xs" role="alert">
                  Project name must be between 2 and 100 characters.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-project-description">Description</Label>
              <Textarea
                id="sa-project-description"
                rows={2}
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {update.isError && (
              <p role="alert" className="text-destructive text-sm">
                The project could not be saved. Check its details and try again.
              </p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                type="submit"
                disabled={
                  !changed ||
                  !validName ||
                  !validDescription ||
                  update.isPending
                }
              >
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-3">
          <CardTitle>Support operations</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            Hold active flows or resume flows held by a platform operator.
            Customer-paused flows remain paused.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onHold}
              disabled={operationPending}
            >
              Hold active flows
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onResume}
              disabled={operationPending}
            >
              Resume held flows
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 gap-0 py-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <CardTitle className="text-destructive">Archive project</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Review active work and affected records before archiving.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void reviewArchive()}
            disabled={archiveLoading}
          >
            {archiveLoading
              ? 'Checking…'
              : archiveImpact
                ? 'Refresh impact'
                : 'Review impact'}
          </Button>
        </CardHeader>
        {(archiveImpact || archiveError) && (
          <CardContent className="space-y-3 px-4 pb-4 text-sm">
            {archiveError && (
              <p role="alert" className="text-destructive">
                {archiveError}
              </p>
            )}
            {archiveImpact && (
              <>
                <p className="text-muted-foreground">
                  {archiveImpact.affected.jobs} jobs ·{' '}
                  {archiveImpact.affected.scheduledJobs} scheduled ·{' '}
                  {archiveImpact.affected.connections} connections ·{' '}
                  {archiveImpact.affected.runHistory} prior runs
                </p>
                <p
                  className={
                    archiveImpact.canArchive
                      ? 'text-muted-foreground'
                      : 'text-destructive'
                  }
                >
                  {archiveImpact.canArchive
                    ? 'No active work blocks archive. Jobs, schedules, and inbound webhooks will be disabled; configuration and history remain stored.'
                    : `Archive blocked: ${archiveImpact.blockers.queuedSyncs} queued syncs, ${archiveImpact.blockers.runningSyncs} running syncs, ${archiveImpact.blockers.activePriorityCycles} active priority cycles.`}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!archiveImpact.canArchive}
                  onClick={() => setArchiveOpen(true)}
                >
                  <Archive className="size-4" aria-hidden /> Archive project
                </Button>
              </>
            )}
          </CardContent>
        )}
      </Card>

      <LifecycleConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => {
          if (!archivePending) setArchiveOpen(open);
        }}
        title={`Archive ${project.name}`}
        description="This project will disappear from the active workspace. Its configuration and run history remain stored."
        bodyWarning="Jobs, schedules, and inbound webhooks will be disabled. Restore is not currently available."
        actionLabel="Archive project"
        tone="danger"
        organisationName={project.name}
        requiresNameConfirm
        caseSensitiveNameConfirm
        minReasonLength={10}
        reasonPlaceholder="Why is this project being archived?"
        isSubmitting={archivePending}
        errorMessage={archiveError}
        onSubmit={(values) => void archive(values)}
      />
    </div>
  );
}

export default function OrganisationProjectSettings({
  organisationId,
  organisationName,
  project,
  onHold,
  onResume,
  operationPending,
}: {
  organisationId: string;
  organisationName: string;
  project: SuperAdminProjectDetail;
  onHold: () => void;
  onResume: () => void;
  operationPending: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = getActiveSection(searchParams);

  const [scheduleVisited, setScheduleVisited] = useState(
    activeSection === 'schedule',
  );
  useEffect(() => {
    if (activeSection === 'schedule') {
      setScheduleVisited(true);
    }
  }, [activeSection]);

  const handleSectionChange = (sectionId: Section) => {
    if (sectionId === 'schedule') {
      setScheduleVisited(true);
    }
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', 'settings');
      next.set('section', sectionId);
      return next;
    });
  };

  const sectionHref = (sectionId: Section) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'settings');
    next.set('section', sectionId);
    return `?${next.toString()}`;
  };

  const scheduleMounted = activeSection === 'schedule' || scheduleVisited;

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]"
      role="region"
      aria-label="Project settings"
    >
      <ProjectSettingsNavigation
        activeId={activeSection}
        items={SECTIONS.map((section) => ({
          id: section.id,
          label: section.label,
          icon: section.icon,
        }))}
        onSelect={(id) => handleSectionChange(id as Section)}
        renderLink={(item, children) => (
          <Link
            to={sectionHref(item.id as Section)}
            aria-current={item.id === activeSection ? 'page' : undefined}
          >
            {children}
          </Link>
        )}
      />

      <div className="min-w-0" aria-label="Project settings content">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          {activeSection === 'general' && (
            <GeneralSettings
              organisationId={organisationId}
              project={project}
              onHold={onHold}
              onResume={onResume}
              operationPending={operationPending}
            />
          )}

          {scheduleMounted && (
            <div
              className={activeSection === 'schedule' ? undefined : 'hidden'}
            >
              <Scheduler
                key={`${organisationId}:${project.id}`}
                organisationId={organisationId}
                projectId={project.id}
                organisationName={organisationName}
                sourcePlatformId={project.sourcePlatformId}
              />
            </div>
          )}

          {activeSection === 'associations' && (
            <Associations
              organisationId={organisationId}
              projectId={project.id}
            />
          )}

          {activeSection === 'environments' && (
            <Migration
              organisationId={organisationId}
              projectId={project.id}
              organisationName={organisationName}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
