import { ArrowRight, CheckCircle2, SlidersHorizontal, Sparkles } from 'lucide-react';

import PlatformIcon from '@/components/platform/PlatformIcon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlatformId } from '@/types';

export interface ConnectionsReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePlatformId?: PlatformId | string;
  sourcePlatformLabel?: string;
  destPlatformId?: PlatformId | string;
  destPlatformLabel?: string;
  environment?: 'sandbox' | 'production' | string;
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ConnectionsReadyDialog({
  open,
  onOpenChange,
  sourcePlatformId,
  sourcePlatformLabel = 'Source',
  destPlatformId,
  destPlatformLabel = 'Destination',
  environment = 'sandbox',
  onContinue,
  onDismiss,
}: ConnectionsReadyDialogProps) {
  const envLabel = environment === 'production' ? 'Production' : 'Sandbox';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success border border-success/20">
            <Sparkles className="size-5.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-base font-bold text-foreground sm:text-lg">
              {envLabel} Connections Ready
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Both platforms are connected and verified. Your project is now ready for data synchronization.
            </DialogDescription>
          </div>
        </div>

        {/* Platform connection confirmation pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-success/25 bg-success/5 px-3 py-2">
            {sourcePlatformId && (
              <PlatformIcon platformId={sourcePlatformId as PlatformId} size={24} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {sourcePlatformLabel}
              </p>
              <p className="text-[11px] text-success font-medium">Source Connected</p>
            </div>
            <CheckCircle2 className="size-4 text-success shrink-0" />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-success/25 bg-success/5 px-3 py-2">
            {destPlatformId && (
              <PlatformIcon platformId={destPlatformId as PlatformId} size={24} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {destPlatformLabel}
              </p>
              <p className="text-[11px] text-success font-medium">Destination Connected</p>
            </div>
            <CheckCircle2 className="size-4 text-success shrink-0" />
          </div>
        </div>

        {/* Project Activation Reassurance Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            Project Activated Automatically
          </div>
          <p className="text-muted-foreground text-[11.5px] leading-relaxed">
            We have activated your project in <span className="font-medium text-foreground">{envLabel}</span> mode. You can manually pause or deactivate sync at any time in Project Settings.
          </p>
        </div>

        {/* Next Step Guidance Card */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <SlidersHorizontal className="size-3.5 text-primary" />
            Next: Configure your first sync flow
          </div>
          <p className="text-muted-foreground text-[11.5px] leading-relaxed">
            Choose which records and fields move between platforms and review a sample before automating.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="sm:flex-1"
          >
            Stay on Connections
          </Button>
          <Button size="sm" onClick={onContinue} className="sm:flex-1">
            Create Sync Flow
            <ArrowRight data-icon="inline-end" className="size-3.5 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
