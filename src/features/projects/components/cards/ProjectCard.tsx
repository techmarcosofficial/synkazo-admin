import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Wand2,
  ArrowRight,
  ArrowLeftRight,
  MoreVertical,
  Copy,
  Trash2,
  Pause,
  Play,
  ExternalLink,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import type { ProjectExtended } from '../../types';

import { PlatformIcon } from '@/components/platform';
import StatusBadge, {
  statusBadge,
  statusDot,
  type Tone,
} from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSetupWizardStore } from '@/features/projects/store';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: ProjectExtended;
  jobCount: number;
  onDuplicate?: (project: ProjectExtended) => void;
  onDelete?: (project: ProjectExtended) => void;
  onTogglePause?: (project: ProjectExtended) => void;
}

// NOTE: assumption — your real environment values may differ from this set
// (I've seen both "production"/"sandbox" and "staging"/"development"/"qa"
// across your data). Unrecognized values fall back to a neutral gray pill
// rather than guessing a color.
const ENV_TONES: Record<string, Tone> = {
  production: 'success',
  sandbox: 'warning',
};

function EnvBadge({ environment }: { environment?: string }) {
  if (!environment) return null;

  const tone = ENV_TONES[environment.toLowerCase()] ?? 'muted';
  return (
    <Badge
      className={cn(
        'rounded-full font-semibold capitalize',
        statusBadge({ tone, size: 'default' }),
      )}
    >
      <span className={statusDot({ tone, size: 'default' })} />
      {environment}
    </Badge>
  );
}

function relativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true }).replace(
    'about ',
    '',
  );
}

function formatCompact(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(n);
}

export default function ProjectCard({
  project,
  jobCount,
  onDuplicate,
  onDelete,
  onTogglePause,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const openSetupWizard = useSetupWizardStore((s) => s.open);

  const setupComplete = !!project.setupCompletedAt;
  const isConnected = project.status !== 'draft' || setupComplete;

  const hasSynced =
    setupComplete &&
    (!!project.lastSyncedAt || (project.totalRecordsSynced ?? 0) > 0);

  // NOTE: assumption — "paused" wasn't in the sample payload; swap for your
  // real status string once you confirm it.
  const isPaused = project.status === 'paused';

  // NOTE: assumption — same draft/further-along split as before. Tighten if
  // you have a more granular status enum.
  const setupCta =
    project.status === 'draft' ? 'Continue setup' : 'Finish setup';

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlatformIcon
              variant="avatar"
              size={'2xl'}
              platformId={project.sourcePlatformId ?? ''}
            />
            <ArrowLeftRight className="text-muted-foreground/60 size-4" />
            <PlatformIcon
              variant="avatar"
              size={'2xl'}
              platformId={project.destPlatformId}
            />
          </div>

          <div className="flex items-center gap-1">
            <StatusBadge status={project.status} size="sm" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <ExternalLink className="size-4" /> View Project
                </DropdownMenuItem>

                {!setupComplete && (
                  <DropdownMenuItem onClick={() => openSetupWizard(project.id)}>
                    <Wand2 className="size-4" /> {setupCta}
                  </DropdownMenuItem>
                )}

                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(project)}>
                    <Copy className="size-4" /> Duplicate
                  </DropdownMenuItem>
                )}

                {onTogglePause && setupComplete && (
                  <DropdownMenuItem onClick={() => onTogglePause(project)}>
                    {isPaused ? (
                      <>
                        <Play className="size-4" /> Resume Sync
                      </>
                    ) : (
                      <>
                        <Pause className="size-4" /> Pause Sync
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(project)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            to={`/projects/${project.id}`}
            className="block truncate text-base font-bold hover:underline"
          >
            {project.name}
          </Link>

          {/* Only show the environment once it's actually been activated — a fresh
              project defaults to "production" in the DB before any setup happens. */}
          <EnvBadge
            environment={
              project.environmentActivatedAt
                ? project.activeEnvironment
                : undefined
            }
          />
        </div>
        <div className="border-t"></div>
      </CardContent>
      <CardFooter>
        {hasSynced ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xl leading-none font-bold">
                  {formatCompact(project.totalRecordsSynced ?? 0)}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Records
                </div>
              </div>
              <div>
                <div className="text-xl leading-none font-bold">{jobCount}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Sync Jobs
                </div>
              </div>
            </div>

            {project.lastSyncedAt && (
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                <Clock className="h-3 w-3" />
                Synced {relativeTime(project.lastSyncedAt)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-muted-foreground flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3" />
                Updated{' '}
                {project.updatedAt ? relativeTime(project.updatedAt) : '—'}
              </span>
              {setupComplete ? (
                <Link
                  to={`/projects/${project.id}`}
                  className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  View project <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  onClick={() => openSetupWizard(project.id)}
                  className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  {setupCta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
