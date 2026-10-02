import { ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { NextActionResolution } from '../types';
import ActionTooltip from './ActionTooltip';

import { Button } from '@/components/ui/button';
import { useCreateProjectStore } from '@/features/projects/store/useCreateProjectStore';
import { cn } from '@/lib/utils';

export interface JourneyStorylineBannerProps {
  nextAction: NextActionResolution;
  stepNumber?: number;
  totalSteps?: number;
  onTriggerModal?: (key: string) => void;
  className?: string;
}

export default function JourneyStorylineBanner({
  nextAction,
  stepNumber = 1,
  totalSteps = 4,
  onTriggerModal,
  className,
}: JourneyStorylineBannerProps) {
  const navigate = useNavigate();
  const openCreateProjectDialog = useCreateProjectStore((s) => s.open);
  const isCreateProject = nextAction.triggerKey === 'create_project';

  const handleAction = () => {
    if (nextAction.isBlocked) return;

    if (onTriggerModal && nextAction.triggerKey) {
      onTriggerModal(nextAction.triggerKey);
      return;
    }

    if (nextAction.triggerKey === 'create_project') {
      openCreateProjectDialog();
      return;
    }

    if (nextAction.actionUrl) {
      const hasFrom = nextAction.actionUrl.includes('from=');
      const separator = nextAction.actionUrl.includes('?') ? '&' : '?';
      const targetUrl = hasFrom
        ? nextAction.actionUrl
        : `${nextAction.actionUrl}${separator}from=dashboard`;

      navigate(targetUrl, {
        state: {
          from: '/dashboard',
          fromLabel: 'Back to Dashboard',
          jobBackTo: '/dashboard',
          jobBackLabel: 'Back to Dashboard',
        },
      });
    }
  };

  return (
    <section
      aria-label="Setup Journey Action"
      className={cn(
        'border-primary/50 bg-primary/5 hover:border-primary/70 relative flex w-full flex-col justify-between gap-5 rounded-2xl border border-dashed p-5 transition-colors sm:flex-row sm:items-center sm:gap-6 sm:p-6',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Progress bars */}
        <div className="flex w-36 gap-1.5" aria-hidden="true">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < stepNumber ? 'bg-primary' : 'bg-primary/20',
              )}
            />
          ))}
        </div>

        <p className="text-primary text-xs font-semibold tracking-wider uppercase">
          Step {stepNumber} of {totalSteps}
          {nextAction.estimatedTime && (
            <span className="text-muted-foreground font-normal lowercase">
              {' '}
              · {isCreateProject ? 'about 1 minute' : nextAction.estimatedTime}
            </span>
          )}
        </p>

        <div>
          <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
            {nextAction.title}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            {isCreateProject
              ? 'Choose your software platforms to set up a secure sync.'
              : nextAction.description}
          </p>
        </div>

        {nextAction.isBlocked && nextAction.blockerReason && (
          <p className="text-warning text-xs font-medium">
            Prerequisite: {nextAction.blockerReason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:self-center">
        <ActionTooltip
          tooltip={nextAction.blockerReason}
          disabled={nextAction.isBlocked}
        >
          <Button
            size="default"
            disabled={nextAction.isBlocked}
            onClick={handleAction}
            className="h-10 gap-2 px-5 text-sm font-semibold shadow-xs"
          >
            {nextAction.isBlocked ? <Lock className="size-4" /> : null}
            <span>
              {isCreateProject ? 'Create project' : nextAction.actionLabel}
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </ActionTooltip>
      </div>
    </section>
  );
}
