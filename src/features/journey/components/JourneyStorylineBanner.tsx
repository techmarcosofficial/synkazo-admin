import { ArrowRight, Compass, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { NextActionResolution } from '../types';
import ActionTooltip from './ActionTooltip';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        'border-primary/20 bg-primary/5 relative overflow-hidden rounded-3xl p-0 shadow-xs',
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
            <Sparkles className="size-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-primary text-[11px] font-semibold tracking-wide uppercase">
                Setup Storyline · Step {stepNumber} of {totalSteps}
              </span>
              {nextAction.estimatedTime && (
                <Badge
                  size="xs"
                  variant="secondary"
                  className="bg-background/80 text-muted-foreground"
                >
                  {nextAction.estimatedTime}
                </Badge>
              )}
            </div>

            <HeadingPair
              visualLevel="card"
              level="h3"
              title={nextAction.title}
              subtitle={nextAction.description}
            />

            {nextAction.isBlocked && nextAction.blockerReason && (
              <p className="text-warning text-xs font-medium">
                Prerequisite: {nextAction.blockerReason}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:self-center">
          <ActionTooltip
            tooltip={nextAction.blockerReason}
            disabled={nextAction.isBlocked}
          >
            <Button
              size="sm"
              disabled={nextAction.isBlocked}
              onClick={handleAction}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              {nextAction.isBlocked && <Lock className="size-3.5" />}
              <span>{nextAction.actionLabel}</span>
              {!nextAction.isBlocked && <ArrowRight className="size-3.5" />}
            </Button>
          </ActionTooltip>
        </div>
      </CardContent>
    </Card>
  );
}
