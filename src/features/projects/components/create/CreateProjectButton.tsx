import { Lock, Plus } from 'lucide-react';

import { useCreateProjectStore } from '../../store/useCreateProjectStore';
import type { ProjectExtended } from '../../types';

import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/features/journey';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useEntitlements } from '@/queries/useEntitlements';

interface CreateProjectButtonProps {
  label?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  onCreated?: (project: ProjectExtended) => void;
}

// Renders the project creation trigger and explains permission or plan blockers.
export default function CreateProjectButton({
  label = 'New Project',
  variant,
  onCreated,
}: CreateProjectButtonProps) {
  const open = useCreateProjectStore((s) => s.open);
  const { hasPermission } = useSynkazoAuth();
  const canCreateProject = hasPermission('project.create');
  const { canAddProject } = useEntitlements();
  const { prompt, dialog } = usePlanUpgradePrompt();

  const isBlockedByPermission = !canCreateProject;
  const isBlockedByPlan = canCreateProject && !canAddProject;

  const tooltipExplanation = isBlockedByPermission
    ? "You don't have permission to create projects. Contact your administrator."
    : isBlockedByPlan
      ? "You've reached your plan's project limit. Upgrade to add more."
      : undefined;

  return (
    <>
      <ActionTooltip
        tooltip={tooltipExplanation}
        disabled={isBlockedByPermission || isBlockedByPlan}
      >
        <Button
          size="sm"
          variant={variant}
          disabled={isBlockedByPermission}
          onClick={() => {
            if (isBlockedByPermission) return;
            if (isBlockedByPlan) {
              prompt(
                "You've reached the number of projects your plan allows. Upgrade to add more.",
              );
              return;
            }
            open({ onCreated });
          }}
        >
          {canCreateProject && canAddProject ? (
            <Plus className="mr-2 h-4 w-4" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          {label}
        </Button>
      </ActionTooltip>
      {dialog}
    </>
  );
}
