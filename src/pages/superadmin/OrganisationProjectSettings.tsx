import {
  Archive,
  CalendarClock,
  ChevronDown,
  Layers3,
  Link2,
  Settings2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import type { ProjectArchiveImpact } from '@/api/projects';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  title: string;
  description: string;
  icon: typeof Settings2;
}[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Project identity, configuration, and support operations.',
    icon: Settings2,
  },
  {
    id: 'schedule',
    title: 'Bulk Scheduler',
    description: 'Manage schedules of all sync flows.',
    icon: CalendarClock,
  },
  {
    id: 'associations',
    title: 'Associations',
    description: 'Rules and pending relationships between synced records.',
    icon: Link2,
  },
  {
    id: 'environments',
    title: 'Environments',
    description: 'Compare and transfer configuration between environments.',
    icon: Layers3,
  },
];

function openSectionsFromParams(params: URLSearchParams): Set<Section> {
  const requested = params.get('section');
  if (!requested) return new Set(['general']);
  if (requested === 'closed') return new Set();
  const sections = requested
    .split(',')
    .filter((id): id is Section =>
      SECTIONS.some((section) => section.id === id),
    );
  return sections.length ? new Set(sections) : new Set(['general']);
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
    <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
      <div className="contents xl:block xl:space-y-3">
        <Card className="order-1 gap-0 py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Project information</CardTitle>
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
                  The project could not be saved. Check its details and try
                  again.
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
        <Card className="border-destructive/30 order-3 gap-0 py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <CardTitle className="text-destructive">
                Archive project
              </CardTitle>
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
      </div>
      <div className="order-2 space-y-3 xl:order-none">
        <Card className="gap-0 py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Project context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 pb-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
            <p>
              <span className="text-muted-foreground">Platforms</span>
              <br />
              <span className="font-medium">
                {project.sourcePlatformId} → {project.destPlatformId}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Status</span>
              <br />
              <Badge variant="outline" className="mt-1 capitalize">
                {project.status}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Sync mode</span>
              <br />
              <span className="font-medium capitalize">
                {project.syncMode.replace(/_/g, ' ')}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Active environment</span>
              <br />
              <span className="font-medium capitalize">
                {project.activeEnvironment || 'Not activated'}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Support operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <p className="text-muted-foreground text-sm">
              Hold active flows or resume flows held by a platform operator.
              Customer-paused flows remain paused.
            </p>
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
      </div>
      <LifecycleConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => {
          if (!archivePending) setArchiveOpen(open);
        }}
        title={`Archive ${project.name}`}
        description="Archive this project and disable all sync flows and webhooks."
        bodyWarning="Configuration and history remain stored. Restore is not currently available."
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
  const openSections = openSectionsFromParams(searchParams);
  const scheduleOpen = openSections.has('schedule');
  const [scheduleVisited, setScheduleVisited] = useState(scheduleOpen);
  useEffect(() => {
    if (scheduleOpen) setScheduleVisited(true);
  }, [scheduleOpen]);
  const toggleSection = (id: Section, open: boolean) => {
    if (id === 'schedule' && open) setScheduleVisited(true);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      const selected = openSectionsFromParams(previous);
      if (open) selected.add(id);
      else selected.delete(id);
      next.set('tab', 'settings');
      next.set(
        'section',
        SECTIONS.filter((section) => selected.has(section.id))
          .map((section) => section.id)
          .join(',') || 'closed',
      );
      return next;
    });
  };

  return (
    <div className="space-y-3" role="region" aria-label="Project settings">
      {SECTIONS.map(({ id, title, description, icon: Icon }) => (
        <Collapsible
          key={id}
          open={openSections.has(id)}
          onOpenChange={(open) => toggleSection(id, open)}
        >
          <Card className="gap-0 py-0">
            <CollapsibleTrigger className="group hover:bg-muted/30 flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors sm:px-5">
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="text-muted-foreground mt-1 block text-xs font-normal">
                  {description}
                </span>
              </span>
              <span className="border-border/60 bg-muted/50 text-muted-foreground group-hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full border">
                <ChevronDown
                  className="size-4 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent
              forceMount={id === 'schedule' ? true : undefined}
              className="bg-muted/20 border-t p-3 data-[state=closed]:hidden sm:p-4"
            >
              {(openSections.has(id) ||
                (id === 'schedule' && scheduleVisited)) && (
                <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                  {id === 'general' ? (
                    <GeneralSettings
                      organisationId={organisationId}
                      project={project}
                      onHold={onHold}
                      onResume={onResume}
                      operationPending={operationPending}
                    />
                  ) : null}
                  {id === 'schedule' ? (
                    <Scheduler
                      key={`${organisationId}:${project.id}`}
                      organisationId={organisationId}
                      projectId={project.id}
                      organisationName={organisationName}
                      sourcePlatformId={project.sourcePlatformId}
                    />
                  ) : null}
                  {id === 'associations' ? (
                    <Associations
                      organisationId={organisationId}
                      projectId={project.id}
                    />
                  ) : null}
                  {id === 'environments' ? (
                    <Migration
                      organisationId={organisationId}
                      projectId={project.id}
                      organisationName={organisationName}
                    />
                  ) : null}
                </Suspense>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
