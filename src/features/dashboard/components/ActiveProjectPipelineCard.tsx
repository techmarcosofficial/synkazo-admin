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
import HeadingPair from '@/components/shared/HeadingPair';
import TextPair from '@/components/shared/TextPair';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Connection, Job, Project, ProjectEnvironment } from '@/types';

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
  const activeEnvironment =
    (project as Project & { activeEnvironment?: ProjectEnvironment })
      .activeEnvironment ?? project.active_environment;
  const isSandbox = activeEnvironment === 'sandbox';

  const isMultipleProjects = totalProjects > 1;

  const projectConnections = connections.filter(
    (c) => c.projectId === project.id,
  );
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

  const step2State: MilestoneState = areConnectionsComplete
    ? 'completed'
    : 'in_progress';
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
    <Card className={cn('relative p-4', className)}>
      <div className="space-y-4">
        {/* Header (Clean, concise, indicates recent project when multiple exist) */}
        <div className="space-y-1">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <HeadingPair
              visualLevel="card"
              title={project.name}
              trailing={
                <PlatformPair
                  sourcePlatformId={project.sourcePlatformId ?? 'servicetitan'}
                  destPlatformId={project.destPlatformId ?? 'hubspot'}
                  variant="badge"
                />
              }
              subtitle={
                isMultipleProjects ? (
                  <>
                    Showing setup for your most recently created project (1 of{' '}
                    {totalProjects} in progress).{' '}
                    <Link
                      to="/projects"
                      className="text-primary inline-flex items-center gap-0.5 font-medium hover:underline"
                    >
                      <span>View all projects</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </>
                ) : (
                  'Setup pipeline checkpoints for this integration. Click any checkpoint to configure.'
                )
              }
            />

            {/* Right Corner: Project Status & Tags */}
            <div className="flex shrink-0 items-center gap-2">
              {isMultipleProjects && (
                <Badge
                  data-testid="tag-recently-created"
                  variant="outline"
                  size="xs"
                  className="bg-muted/60 text-muted-foreground"
                >
                  Recently Created
                </Badge>
              )}
              <StatusBadge status={project.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Milestone Steps Tracker (Clickable cards without inner button clutter) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1: Project Established */}
          <div className="bg-card border-border/80 flex flex-col justify-between space-y-3 rounded-2xl border p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Step 1
                </span>
                <div className="bg-success/15 text-success flex size-5.5 items-center justify-center rounded-full">
                  <Check className="size-3" />
                </div>
              </div>
              <HeadingPair
                level="h3"
                visualLevel="item"
                title="Project Created"
                subtitle="Endpoints defined"
              />
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
            onClick={() =>
              navigate(`/projects/${project.id}?tab=connections`, {
                state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
              })
            }
            disabled={!canManage}
            className={cn(
              'group bg-card border-border/80 flex flex-col justify-between space-y-3 rounded-2xl border p-4 text-left transition-all duration-200',
              canManage
                ? 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs'
                : 'cursor-not-allowed opacity-60',
            )}
          >
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
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
              <TextPair
                title="Connections"
                subtitle={
                  areConnectionsComplete
                    ? 'Both platforms authorized'
                    : 'Authenticate endpoints'
                }
              />
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
              <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-all group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* Step 3: Sync Flows & Mappings (Clickable card) */}
          <button
            type="button"
            aria-label="Configure sync flows and mappings"
            data-testid="step-sync-flows"
            disabled={step3State === 'pending' || !canManage}
            onClick={() =>
              navigate(`/projects/${project.id}?tab=sync-rules`, {
                state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
              })
            }
            className={cn(
              'group flex flex-col justify-between space-y-3 rounded-2xl border p-4 text-left transition-all duration-200',
              step3State !== 'pending' && canManage
                ? 'bg-card border-border/80 hover:border-foreground/20 hover:bg-muted/30 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs'
                : 'bg-muted/20 border-border/40 cursor-not-allowed opacity-50',
            )}
          >
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
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
              <TextPair
                title="Sync Flows"
                subtitle={
                  step3State === 'completed'
                    ? `${projectJobs.length} flow(s) configured`
                    : step3State === 'in_progress'
                      ? 'Map object fields'
                      : 'Requires connections'
                }
              />
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
                <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-all group-hover:translate-x-0.5" />
              )}
            </div>
          </button>

          {/* Step 4: Limited run (Clickable card) */}
          <button
            type="button"
            aria-label={
              isSandbox ? 'Review Sandbox test run' : 'Run limited sync'
            }
            data-testid="step-sample-test"
            disabled={step4State === 'pending' || !canManage}
            onClick={() =>
              navigate(`/projects/${project.id}?tab=sync-rules`, {
                state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
              })
            }
            className={cn(
              'group flex flex-col justify-between space-y-3 rounded-2xl border p-4 text-left transition-all duration-200',
              step4State !== 'pending' && canManage
                ? 'bg-card border-border/80 hover:border-foreground/20 hover:bg-muted/30 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs'
                : 'bg-muted/20 border-border/40 cursor-not-allowed opacity-50',
            )}
          >
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
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
              <TextPair
                title={isSandbox ? 'Test & Review' : 'Limited Run'}
                subtitle={
                  step4State === 'completed'
                    ? 'Sync run completed'
                    : step4State === 'in_progress'
                      ? isSandbox
                        ? 'Review a 5-record Sandbox run'
                        : 'Run a controlled subset'
                      : 'Requires sync flows'
                }
              />
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
                    ? isSandbox
                      ? 'Test Now'
                      : 'Run Now'
                    : 'Locked'}
              </span>
              {step4State !== 'pending' && (
                <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-all group-hover:translate-x-0.5" />
              )}
            </div>
          </button>
        </div>

        {/* Safety Callout Footer */}
        <div className="border-border/60 text-muted-foreground flex items-center gap-2 border-t pt-3 text-[11.5px]">
          <ShieldCheck className="text-muted-foreground size-3.5 shrink-0" />
          <span>
            {isSandbox
              ? 'Limited runs write to Sandbox only. Production records remain untouched.'
              : 'Limited runs write to Production. Review your settings before starting.'}
          </span>
        </div>
      </div>
    </Card>
  );
}
