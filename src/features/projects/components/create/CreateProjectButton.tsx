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

// Renders the project creation trigger. Enforces both organization-level role
// permissions (must be org_admin) and plan-level entitlements, providing
// clear tooltip explanations rather than silent 403 errors.
export default function CreateProjectButton({
  label = 'New Project',
  variant,
  onCreated,
}: CreateProjectButtonProps) {
  const open = useCreateProjectStore((s) => s.open);
  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');
  const { canAddProject } = useEntitlements();
  const { prompt, dialog } = usePlanUpgradePrompt();

  const isBlockedByRole = !canManage;
  const isBlockedByPlan = canManage && !canAddProject;

  const tooltipExplanation = isBlockedByRole
    ? 'Only Organization Admins can create new projects. Contact your administrator for access.'
    : isBlockedByPlan
      ? "You've reached your plan's project limit. Upgrade to add more."
      : undefined;

  return (
    <>
      <ActionTooltip
        tooltip={tooltipExplanation}
        disabled={isBlockedByRole || isBlockedByPlan}
      >
        <Button
          size="lg"
          variant={variant}
          disabled={isBlockedByRole}
          onClick={() => {
            if (isBlockedByRole) return;
            if (isBlockedByPlan) {
              prompt(
                "You've reached the number of projects your plan allows. Upgrade to add more.",
              );
              return;
            }
            open({ onCreated });
          }}
        >
          {canManage && canAddProject ? (
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
