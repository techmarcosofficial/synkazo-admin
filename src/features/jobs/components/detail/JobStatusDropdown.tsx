import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import StatusBadge from '@/components/shared/StatusBadge';
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
}) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const disabledReason = !hasConnection
    ? 'Connect platforms first'
    : fieldMappingCount === 0
      ? 'Add field mappings first'
      : 'Mark at least 1 Match Field';

  return (
    <>
      <div className="relative inline-flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={toggling}>
            <Button
              id="job-status-dropdown"
              variant="outline"
              size="sm"
              className={cn(
                'group h-7 rounded-full px-2.5 transition-all duration-300',
                highlighted &&
                  'ring-primary ring-offset-background animate-alert-shake ring-2 ring-offset-2',
              )}
            >
              <StatusBadge variant="menu" status={isActive ? 'active' : 'idle'} />
              <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72" align="start">
            <DropdownMenuLabel>Change Job Status</DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={isActive || !canActivate}
              onSelect={() => !isActive && canActivate && onToggle()}
              title={!canActivate ? disabledReason : undefined}
              className="flex flex-col items-start gap-0.5 py-1.5"
            >
              <div className="flex w-full items-center justify-between">
                <StatusBadge status="active" variant="menu" showDescription />
                {isActive && <Check className="text-primary ml-auto size-4" />}
              </div>
              {!canActivate && (
                <span className="text-muted-foreground pl-6 text-[11px] font-normal">
                  Blocked: {disabledReason}
                </span>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={!isActive}
              onSelect={(e) => {
                if (isActive) {
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
            className="animate-pointer-nudge pointer-events-none absolute -bottom-8 left-0 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-lg"
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
            <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
              {isSyncing ? (
                <>
                  <span className="text-destructive font-semibold block">
                    ⚠️ A sync is currently in progress.
                  </span>
                  Setting this job to Inactive will stop the running sync immediately
                  and freeze all future scheduled and priority queue data movement.
                </>
              ) : (
                'Setting this job to Inactive will freeze all data movement. Scheduled runs, priority queue syncs, and manual triggers will not execute until reactivated.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
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
