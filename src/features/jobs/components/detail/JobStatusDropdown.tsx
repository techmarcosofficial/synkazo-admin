import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import StatusBadge from '@/components/shared/StatusBadge';
import { badgeToneClasses, useBadgeAppearance } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

export default function JobStatusDropdown({
  isActive,
  canActivate,
  hasConnection,
  fieldMappingCount,
  toggling,
  onToggle,
  isSyncing = false,
  onStop,
  highlighted = false,
  canDeactivate = true,
}: {
  isActive: boolean;
  canActivate: boolean;
  hasConnection: boolean;
  fieldMappingCount: number;
  toggling: boolean;
  onToggle: () => void;
  isSyncing?: boolean;
  onStop?: () => void | Promise<void>;
  highlighted?: boolean;
  canDeactivate?: boolean;
}) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const tinted = useBadgeAppearance() === 'tinted';
  const { hasPermission } = useSynkazoAuth();
  const canRunJob = hasPermission('job.run');

  const disabledReason = !hasConnection
    ? 'Connect both platforms first'
    : fieldMappingCount === 0
      ? 'Map your fields first'
      : 'Designate a Unique Identifier first';

  return (
    <>
      <div className="relative inline-flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={toggling || !canRunJob}>
            <Button
              id="job-status-dropdown"
              variant={tinted ? 'ghost' : 'outline'}
              size="sm"
              shape="pill"
              data-badge-control={tinted ? 'tinted' : undefined}
              className={cn(
                'group transition-all duration-300',
                tinted && 'border-0 shadow-none',
                tinted && badgeToneClasses[isActive ? 'success' : 'muted'],
                highlighted &&
                  'ring-primary ring-offset-background animate-alert-shake ring-2 ring-offset-2',
              )}
              title={
                canRunJob
                  ? undefined
                  : "You don't have permission to run or pause this job."
              }
            >
              <StatusBadge
                variant="menu"
                status={isActive ? 'active' : 'idle'}
              />
              <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72" align="start">
            <DropdownMenuLabel>Change Job Status</DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={!canRunJob || isActive || !canActivate}
              onSelect={() =>
                canRunJob && !isActive && canActivate && onToggle()
              }
              title={
                !canRunJob
                  ? "You don't have permission to run or pause this job."
                  : !canActivate
                    ? disabledReason
                    : undefined
              }
              className="flex flex-col items-start gap-0.5 py-1.5"
            >
              <div className="flex w-full items-center justify-between">
                <StatusBadge status="active" variant="menu" showDescription />
                {isActive && <Check className="text-primary ml-auto size-4" />}
              </div>
              {(!canActivate || !canRunJob) && (
                <span className="text-muted-foreground pl-6 text-[11px] font-normal">
                  Blocked:{' '}
                  {canRunJob
                    ? disabledReason
                    : "You don't have permission to run or pause this job."}
                </span>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={!canRunJob || !isActive || !canDeactivate}
              title={
                !canRunJob
                  ? "You don't have permission to run or pause this job."
                  : !canDeactivate
                    ? 'Wait for the current run to finish'
                    : undefined
              }
              onSelect={(e) => {
                if (canRunJob && isActive && canDeactivate) {
                  e.preventDefault();
                  setShowDeactivateConfirm(true);
                }
              }}
            >
              <StatusBadge status="idle" variant="menu" showDescription />
              {!isActive && <Check className="text-primary ml-auto size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {highlighted && (
          <div
            role="status"
            aria-live="polite"
            className="animate-pointer-nudge bg-primary text-primary-foreground pointer-events-none absolute -bottom-8 left-0 z-30 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-lg"
          >
            <span aria-hidden="true" className="text-xs">
              👆
            </span>
            <span>Set job Active here</span>
          </div>
        )}
      </div>

      <AlertDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
      >
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>Set job to Inactive?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-2 text-sm">
              {isSyncing ? (
                <>
                  <span className="text-destructive block font-semibold">
                    ⚠️ A sync is currently in progress.
                  </span>
                  Setting this job to Inactive will stop the running sync
                  immediately and freeze all future scheduled and priority queue
                  data movement.
                </>
              ) : (
                'Setting this job to Inactive will freeze all data movement. Scheduled runs, priority queue syncs, and manual triggers will not execute until reactivated.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeactivateConfirm(false);
                if (isSyncing) {
                  void onStop?.();
                }
                onToggle();
              }}
            >
              {isSyncing ? 'Stop sync & set Inactive' : 'Set to Inactive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
