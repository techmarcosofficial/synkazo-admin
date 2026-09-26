import {
  ArrowRight,
  Check,
  CheckCircle2,
  Layers,
  Lock,
  Plug,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { PlatformPair } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Connection, Job, Project } from '@/types';

export interface ActiveProjectPipelineCardProps {
  project: Project;
  connections: Connection[];
  jobs: Job[];
  canManage?: boolean;
  totalProjects?: number;
  className?: string;
}

type MilestoneState = 'completed' | 'in_progress' | 'pending';

export default function ActiveProjectPipelineCard({
  project,
  connections,
  jobs,
  canManage = true,
  totalProjects = 1,
  className,
}: ActiveProjectPipelineCardProps) {
  const navigate = useNavigate();

  const isMultipleProjects = totalProjects > 1;

  const projectConnections = connections.filter((c) => c.projectId === project.id);
  const projectJobs = jobs.filter((j) => j.projectId === project.id);

  const sourceConnection = projectConnections.find(
    (c) =>
      c.connectionType === 'source' ||
      (project.sourcePlatformId && c.platformId === project.sourcePlatformId),
  );
  const destConnection = projectConnections.find(
    (c) =>
      c.connectionType === 'destination' ||
      (project.destPlatformId && c.platformId === project.destPlatformId),
  );

  const isSourceConnected = sourceConnection?.status === 'connected';
  const isDestConnected = destConnection?.status === 'connected';
  const areConnectionsComplete = Boolean(isSourceConnected && isDestConnected);

  const isJobsComplete = projectJobs.length > 0;
  const isTestComplete = Boolean(
    projectJobs.some((j) => (j.recordsSynced ?? 0) > 0 || j.lastSyncedAt),
  );

  const step2State: MilestoneState = areConnectionsComplete ? 'completed' : 'in_progress';
  const step3State: MilestoneState = !areConnectionsComplete
    ? 'pending'
    : isJobsComplete
      ? 'completed'
      : 'in_progress';
  const step4State: MilestoneState = !isJobsComplete
    ? 'pending'
    : isTestComplete
      ? 'completed'
      : 'in_progress';

  return (
    <Card
      className={cn(
        'border-border bg-card relative overflow-hidden rounded-4xl p-5 shadow-xs sm:p-6',
        className,
      )}
    >
      <div className="space-y-4">
        {/* Header (Clean, concise, indicates recent project when multiple exist) */}
        <div className="space-y-1">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Project Name and Platform Pair in one line */}
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
                {project.name}
              </h2>
              <PlatformPair
                sourcePlatformId={project.sourcePlatformId ?? 'servicetitan'}
                destPlatformId={project.destPlatformId ?? 'hubspot'}
                variant="badge"
              />
            </div>

            {/* Right Corner: Project Status & Tags */}
            <div className="flex shrink-0 items-center gap-2">
              {isMultipleProjects && (
                <span
                  data-testid="tag-recently-created"
                  className="border-border/80 bg-muted/60 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                >
                  Recently Created
                </span>
              )}
              <StatusBadge status={project.status} size="sm" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {isMultipleProjects ? (
              <>
                Showing setup for your most recently created project (1 of {totalProjects} in progress).{' '}
                <Link
                  to="/projects"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  <span>View all projects</span>
                  <ArrowRight className="size-3" />
                </Link>
              </>
            ) : (
              'Setup pipeline checkpoints for this integration. Click any checkpoint to configure.'
            )}
          </p>
        </div>

        {/* Milestone Steps Tracker (Clickable cards without inner button clutter) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1: Project Established */}
          <div className="bg-card border-border/80 flex flex-col justify-between rounded-2xl border p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Step 1
                </span>
                <div className="bg-success/15 text-success flex size-5.5 items-center justify-center rounded-full">
                  <Check className="size-3" />
                </div>
              </div>
              <h3 className="text-foreground text-sm font-semibold">Project Created</h3>
              <p className="text-muted-foreground text-xs">Endpoints defined</p>
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="text-success size-3 shrink-0" />
              <span>Ready</span>
            </div>
          </div>

          {/* Step 2: Platform Connections (Clickable card) */}
          <button
            type="button"
            aria-label="Configure platform connections"
            data-testid="step-connections"
            onClick={() => navigate(`/projects/${project.id}?tab=connections`)}
            disabled={!canManage}
            className={cn(
              'group bg-card border-border/80 flex flex-col justify-between rounded-2xl border p-4 text-left space-y-3 transition-all duration-200',
              canManage
                ? 'hover:-translate-y-0.5 hover:shadow-xs hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
                : 'opacity-60 cursor-not-allowed',
            )}
          >
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Step 2
                </span>
                {step2State === 'completed' ? (
                  <div className="bg-success/15 text-success flex size-5.5 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-5.5 items-center justify-center rounded-full">
                    <Plug className="size-3" />
                  </div>
                )}
              </div>
              <h3 className="text-foreground text-sm font-semibold transition-colors">
                Connections
              </h3>
              <p className="text-muted-foreground text-xs">
                {areConnectionsComplete
                  ? 'Both platforms authorized'
                  : 'Authenticate endpoints'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span
                className={
                  step2State === 'completed'
                    ? 'text-success font-medium'
                    : 'text-foreground font-medium'
                }
              >
                {step2State === 'completed' ? 'Connected' : 'Action Required'}
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 size-3.5 transition-all" />
            </div>
          </button>

          {/* Step 3: Sync Flows & Mappings (Clickable card) */}
          <button
            type="button"
            aria-label="Configure sync flows and mappings"
            data-testid="step-sync-flows"
            disabled={step3State === 'pending' || !canManage}
            onClick={() => navigate(`/projects/${project.id}?tab=sync-rules`)}
            className={cn(
              'group flex flex-col justify-between rounded-2xl border p-4 text-left space-y-3 transition-all duration-200',
              step3State !== 'pending' && canManage
                ? 'bg-card border-border/80 hover:-translate-y-0.5 hover:shadow-xs hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
                : 'bg-muted/20 border-border/40 opacity-50 cursor-not-allowed',
            )}
          >
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Step 3
                </span>
                {step3State === 'completed' ? (
                  <div className="bg-success/15 text-success flex size-5.5 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </div>
                ) : step3State === 'in_progress' ? (
                  <div className="bg-muted text-muted-foreground flex size-5.5 items-center justify-center rounded-full">
                    <Layers className="size-3" />
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-5.5 items-center justify-center rounded-full text-[10px] font-semibold">
                    <Lock className="size-2.5" />
                  </div>
                )}
              </div>
              <h3 className="text-foreground text-sm font-semibold transition-colors">
                Sync Flows
              </h3>
              <p className="text-muted-foreground text-xs">
                {step3State === 'completed'
                  ? `${projectJobs.length} flow(s) configured`
                  : step3State === 'in_progress'
                    ? 'Map object fields'
                    : 'Requires connections'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span
                className={
                  step3State === 'completed'
                    ? 'text-success font-medium'
                    : step3State === 'in_progress'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                }
              >
                {step3State === 'completed'
                  ? 'Mapped'
                  : step3State === 'in_progress'
                    ? 'Configure'
                    : 'Locked'}
              </span>
              {step3State !== 'pending' && (
                <ArrowRight className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 size-3.5 transition-all" />
              )}
            </div>
          </button>

          {/* Step 4: Safe Sample Test (Clickable card) */}
          <button
            type="button"
            aria-label="Run safe sample test"
            data-testid="step-sample-test"
            disabled={step4State === 'pending' || !canManage}
            onClick={() => navigate(`/projects/${project.id}?tab=sync-rules`)}
            className={cn(
              'group flex flex-col justify-between rounded-2xl border p-4 text-left space-y-3 transition-all duration-200',
              step4State !== 'pending' && canManage
                ? 'bg-card border-border/80 hover:-translate-y-0.5 hover:shadow-xs hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
                : 'bg-muted/20 border-border/40 opacity-50 cursor-not-allowed',
            )}
          >
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Step 4
                </span>
                {step4State === 'completed' ? (
                  <div className="bg-success/15 text-success flex size-5.5 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </div>
                ) : step4State === 'in_progress' ? (
                  <div className="bg-muted text-muted-foreground flex size-5.5 items-center justify-center rounded-full">
                    <Sparkles className="size-3" />
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-5.5 items-center justify-center rounded-full text-[10px] font-semibold">
                    <Lock className="size-2.5" />
                  </div>
                )}
              </div>
              <h3 className="text-foreground text-sm font-semibold transition-colors">
                Sample Test
              </h3>
              <p className="text-muted-foreground text-xs">
                {step4State === 'completed'
                  ? 'Verified with 5 records'
                  : step4State === 'in_progress'
                    ? 'Isolated 5-record preview'
                    : 'Requires sync flows'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span
                className={
                  step4State === 'completed'
                    ? 'text-success font-medium'
                    : step4State === 'in_progress'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                }
              >
                {step4State === 'completed'
                  ? 'Verified'
                  : step4State === 'in_progress'
                    ? 'Test Now'
                    : 'Locked'}
              </span>
              {step4State !== 'pending' && (
                <ArrowRight className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 size-3.5 transition-all" />
              )}
            </div>
          </button>
        </div>

        {/* Safety Callout Footer */}
        <div className="border-border/60 flex items-center gap-2 border-t pt-3 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="text-muted-foreground size-3.5 shrink-0" />
          <span>
            Production records remain untouched until sample test results are reviewed and approved.
          </span>
        </div>
      </div>
    </Card>
  );
}
