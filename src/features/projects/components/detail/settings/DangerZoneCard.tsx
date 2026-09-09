import {
  Activity,
  AlertCircle,
  Archive,
  BriefcaseBusiness,
  Clock3,
  Database,
  Link2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import type { ProjectArchiveImpact } from '@/api/projects';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectArchive, type ProjectExt } from '@/features/projects/hooks';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';

function ImpactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-muted/50 rounded-2xl px-3 py-2.5">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ArchiveDialog({
  project,
  impact,
  open,
  onOpenChange,
  onArchived,
  archiveProject,
  archiveErrorMessage,
}: {
  project: ProjectExt;
  impact: ProjectArchiveImpact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchived: () => void;
  archiveProject: (confirmation: string) => Promise<unknown>;
  archiveErrorMessage: (error: unknown) => string;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmation === project.name;

  const performArchive = async () => {
    if (!confirmed || archiving) return;
    setArchiving(true);
    setError(null);
    try {
      await archiveProject(confirmation);
      showToast.success('Project archived.');
      onArchived();
    } catch (archiveError) {
      setError(archiveErrorMessage(archiveError));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (archiving) return;
        onOpenChange(next);
        if (!next) {
          setConfirmation('');
          setError(null);
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-3">
            <span className="bg-destructive/10 flex size-10 items-center justify-center rounded-xl">
              <Archive className="size-5" />
            </span>
            Archive {project.name}?
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Execution will be disabled</AlertTitle>
          <AlertDescription>
            This project will disappear from the active workspace. Its{' '}
            {impact.affected.jobs} jobs, {impact.affected.connections}{' '}
            connections, configuration, and history remain stored, but job
            schedules, inbound webhooks, and the priority schedule are disabled.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="archive-project-confirmation">
            Type <span className="font-mono font-semibold">{project.name}</span>{' '}
            to confirm
          </Label>
          <Input
            id="archive-project-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={archiving}
          />
          <p className="text-muted-foreground text-xs">
            The name must match exactly. This workspace does not currently
            provide a restore action.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmation('');
              setError(null);
              onOpenChange(false);
            }}
            disabled={archiving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={performArchive}
            disabled={!confirmed || archiving}
          >
            {archiving ? <RefreshCw className="animate-spin" /> : <Archive />}
            {archiving ? 'Archiving…' : 'Archive project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DangerZoneCard({
  project,
  onDeleted,
}: {
  project: ProjectExt;
  onDeleted: () => void;
}) {
  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    impact,
    loading,
    error,
    refreshImpact,
    archiveProject,
    archiveErrorMessage,
  } = useProjectArchive(project.id);

  const blockerCount = impact
    ? Object.values(impact.blockers).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <Card className="border-destructive/30">
      {impact && (
        <ArchiveDialog
          project={project}
          impact={impact}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onArchived={onDeleted}
          archiveProject={archiveProject}
          archiveErrorMessage={archiveErrorMessage}
        />
      )}

      <CardHeader className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription className="mt-1">
            Archive this project only after reviewing its live execution impact.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!canManage && (
            <Badge variant="secondary">Admin access required</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshImpact()}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            Refresh impact
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !impact ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Archive impact unavailable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshImpact()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : impact ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <ImpactMetric
                icon={BriefcaseBusiness}
                label="Jobs retained"
                value={impact.affected.jobs}
              />
              <ImpactMetric
                icon={Clock3}
                label="Schedules disabled"
                value={
                  impact.affected.scheduledJobs +
                  impact.affected.prioritySchedules
                }
              />
              <ImpactMetric
                icon={Link2}
                label="Connections retained"
                value={impact.affected.connections}
              />
              <ImpactMetric
                icon={Database}
                label="Runs retained"
                value={impact.affected.runHistory}
              />
              <ImpactMetric
                icon={Activity}
                label="Active blockers"
                value={blockerCount}
              />
            </div>

            {impact.canArchive ? (
              <Alert>
                <Archive />
                <AlertTitle>Ready to archive</AlertTitle>
                <AlertDescription>
                  No queued syncs, running syncs, or active priority cycles were
                  found. Refresh this check if you wait before continuing.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <Activity />
                <AlertTitle>Active work must finish first</AlertTitle>
                <AlertDescription>
                  {impact.blockers.queuedSyncs} queued syncs,{' '}
                  {impact.blockers.runningSyncs} running syncs, and{' '}
                  {impact.blockers.activePriorityCycles} active priority cycles
                  currently block archive. Wait for them to finish, then refresh
                  the impact.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <p className="text-sm font-semibold">Archive project</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  This is a soft archive. Related records are retained rather
                  than permanently deleted.
                </p>
              </div>
              {canManage && (
                <Button
                  variant="destructive"
                  onClick={() => setDialogOpen(true)}
                  disabled={!impact.canArchive || loading}
                >
                  <Archive /> Review and archive
                </Button>
              )}
            </div>
          </>
        ) : null}

        {impact && (
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={impact.canArchive ? 'ready' : 'blocked'}
              size="sm"
            />
            <span className="text-muted-foreground text-xs">
              Impact checked against current database and queue state.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
