import { Lock, Plus } from 'lucide-react';

import { useCreateProjectStore } from '../../store/useCreateProjectStore';
import type { ProjectExtended } from '../../types';

import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/queries/useEntitlements';

interface CreateProjectButtonProps {
  label?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  onCreated?: (project: ProjectExtended) => void;
}

// Renders only the trigger — callers are expected to also render a single
// <CreateProjectDialog /> (both current call sites already do), since the
// dialog is driven by the shared useCreateProjectStore and mounting it here
// too would double it up with the caller's instance.
export default function CreateProjectButton({
  label = 'New Project',
  variant,
  onCreated,
}: CreateProjectButtonProps) {
  const open = useCreateProjectStore((s) => s.open);
  // Explain the project allowance up front rather than after a 403 from the create call.
  const { canAddProject } = useEntitlements();
  const { prompt, dialog } = usePlanUpgradePrompt();

  return (
    <>
      <Button
        size={'lg'}
        variant={variant}
        onClick={() =>
          canAddProject
            ? open({ onCreated })
            : prompt(
                "You've reached the number of projects your plan allows. Upgrade to add more.",
              )
        }
      >
        {canAddProject ? (
          <Plus className="mr-2 h-4 w-4" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {dialog}
    </>
  );
}
