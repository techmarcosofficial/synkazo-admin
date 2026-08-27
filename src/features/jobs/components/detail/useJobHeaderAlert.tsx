import { AlertTriangle, Bookmark, Check, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from './context';

import { projectsApi } from '@/api/projects';
import type { AlertVariant } from '@/components/shared/PageContextAlert';
import { Button } from '@/components/ui/button';
import { pickHighestPriority } from '@/lib/alertPriority';
import type { ProjectStatus } from '@/types';

interface JobHeaderAlertCandidate {
  key: string;
  variant: AlertVariant;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: typeof AlertTriangle;
}

export interface ResolvedJobHeaderAlert extends JobHeaderAlertCandidate {
  id: string;
}

/** Computes the job header's candidate state alerts and resolves the single highest-priority one to show. */
export function useJobHeaderAlert(): ResolvedJobHeaderAlert | undefined {
  const {
    jobId,
    job,
    project,
    jobFieldMappings,
    hasConnection,
    isSyncing,
    toggling,
    handleToggle,
    handleTabChange,
    refetch,
  } = useJobDetailContext();

  const [activatingProject, setActivatingProject] = useState(false);

  const isActive = !!job.isEnabled;
  const hasMatchField = jobFieldMappings.some((m) => m.matchDestKey);
  const isProjectActive = project?.status === 'active';
  const canActivate =
    jobFieldMappings.length > 0 &&
    hasMatchField &&
    hasConnection &&
    isProjectActive;

  const candidates: JobHeaderAlertCandidate[] = [];

  // The old copy sent users to project settings to "change its status" — there is no such
  // field there (see item 23). Activating right from here is both the fix for that dead end
  // and what the user actually wants (item 5/16b): one click instead of a navigation detour.
  const handleActivateProject = async () => {
    if (!project) return;
    setActivatingProject(true);
    try {
      await projectsApi.updateProject(project.id, {
        status: 'active' as ProjectStatus,
      });
      toast.success('Project activated!');
      refetch();
    } catch {
      toast.error('Could not activate project — check connections first.');
    } finally {
      setActivatingProject(false);
    }
  };

  if (!isProjectActive) {
    candidates.push({
      key: 'project-inactive',
      variant: 'warning',
      icon: AlertTriangle,
      title: 'This project must be Active before sync operations can run',
      description: (
        <>
          This project is currently{' '}
          <strong className="text-foreground">
            {project?.status ?? 'inactive'}
          </strong>
          .{' '}
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={handleActivateProject}
            disabled={activatingProject}
          >
            {activatingProject ? 'Activating…' : 'Activate Project'}
          </Button>{' '}
          to enable synchronization.
        </>
      ),
    });
  }

  if (isProjectActive && !canActivate) {
    candidates.push({
      key: 'setup-incomplete',
      variant: 'warning',
      icon: AlertTriangle,
      title: 'Setup incomplete — all buttons disabled until resolved',
      description: (
        <ul className="list-disc space-y-0.5 pl-4">
          {!hasConnection && (
            <li>
              Connect source and destination platforms in the project settings
            </li>
          )}
          {jobFieldMappings.length === 0 && (
            <li>
              Add at least one field mapping in the{' '}
              <button
                onClick={() => handleTabChange('field-mapping')}
                className="hover:text-foreground underline transition-colors"
              >
                Field Mapping
              </button>{' '}
              tab
            </li>
          )}
          {jobFieldMappings.length > 0 && !hasMatchField && (
            <li>
              Mark at least one field as a{' '}
              <button
                onClick={() => handleTabChange('field-mapping')}
                className="hover:text-foreground underline transition-colors"
              >
                Match Field
              </button>{' '}
              — required to match existing HubSpot records
            </li>
          )}
        </ul>
      ),
    });
  }

  if (canActivate && !isActive) {
    candidates.push({
      key: 'ready-to-activate',
      variant: 'success',
      icon: Check,
      title: 'Setup complete — activate to start scheduled syncing',
      description: (
        <>
          This project is fully configured.{' '}
          <Button
            variant="link"
            size="xs"
            className="text-success h-auto p-0"
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? 'Activating…' : 'Activate'}
          </Button>{' '}
          to enable synchronization.
        </>
      ),
    });
  }

  if (job.checkpointPage != null) {
    candidates.push({
      key: 'checkpoint-resume',
      variant: 'info',
      icon: Bookmark,
      title: `Paused at batch ${job.checkpointPage + 1} — next run will resume from where it left off`,
      description: (
        <>
          Click <strong className="text-foreground">Run</strong> to resume ·{' '}
          <strong className="text-foreground">Sync All</strong> to restart from
          scratch
        </>
      ),
    });
  }

  // A previous Sync All (full resync) was interrupted — paused, budget-capped, or the
  // process restarted — mid-pass. Clicking Sync All again resumes from this page instead
  // of restarting at page 1 (see useJobRunState.handleSyncAll).
  if (job.syncAllPage != null) {
    candidates.push({
      key: 'sync-all-resume',
      variant: 'info',
      icon: Bookmark,
      title: `Sync All paused at page ${job.syncAllPage} — next Sync All will resume from there`,
      description: (
        <>
          Click <strong className="text-foreground">Sync All</strong> to
          continue from page {job.syncAllPage}.
        </>
      ),
    });
  }

  if (
    isActive &&
    !job.lastSyncedAt &&
    job.checkpointPage == null &&
    !isSyncing
  ) {
    candidates.push({
      key: 'first-run',
      variant: 'info',
      icon: SkipForward,
      title: 'First run — no historical data loaded yet',
      description: (
        <>
          <strong className="text-foreground">Run Now</strong> only syncs
          records changed since this moment (returns 0 on first run). Use{' '}
          <strong className="text-foreground">Full Resync</strong> to load all
          historical records from ServiceTitan.
        </>
      ),
    });
  }

  const resolved = pickHighestPriority(candidates);
  return resolved
    ? { ...resolved, id: `job-detail:${jobId}:${resolved.key}` }
    : undefined;
}
