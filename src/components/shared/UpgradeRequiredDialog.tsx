import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
}

// Shown when the backend rejects an action with a PLAN_LIMIT_* error code — the org
// has hit a plan limit (e.g. monthly synced-record cap) and needs to upgrade to
// continue. Reused across any manual sync-trigger entry point.
export default function UpgradeRequiredDialog({
  open,
  onOpenChange,
  message,
}: UpgradeRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-warning/10 flex size-8 items-center justify-center rounded-lg">
              <Sparkles className="text-warning size-4" />
            </div>
            <div>Upgrade Required</div>
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{message}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild>
            <a href={`${import.meta.env.VITE_FRONTEND_URL}/pricing`}>
              Upgrade plan
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
