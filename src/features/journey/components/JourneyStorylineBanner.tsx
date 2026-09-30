import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { NextActionResolution } from '../types';
import ActionTooltip from './ActionTooltip';

import { Button } from '@/components/ui/button';
import HeadingPair from '@/components/shared/HeadingPair';
import { Card, CardContent } from '@/components/ui/card';
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
      navigate(nextAction.actionUrl);
    }
  };

  return (
    <Card
      className={cn(
        'border-primary bg-primary/10 relative w-full overflow-hidden rounded-3xl border-dashed p-0 shadow-none',
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm">
            Step {stepNumber} of {totalSteps}
            {nextAction.estimatedTime && (
              <>
                {' '}
                ·{' '}
                {isCreateProject ? 'About 1 minute' : nextAction.estimatedTime}
              </>
            )}
          </p>

          <HeadingPair
            visualLevel="section"
            level="h3"
            title={<span className="font-bold">{nextAction.title}</span>}
            subtitle={
              isCreateProject
                ? 'Choose your software platforms to set up a secure sync.'
                : nextAction.description
            }
          />

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
              className="gap-2 text-sm"
            >
              {nextAction.isBlocked && <Lock className="size-3.5" />}
              <span>
                {isCreateProject ? 'Create project' : nextAction.actionLabel}
              </span>
            </Button>
          </ActionTooltip>
        </div>
      </CardContent>
    </Card>
  );
}
