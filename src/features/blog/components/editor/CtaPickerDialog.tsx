import { MousePointerClick } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCtasQuery } from '@/queries/useBlog';

export function CtaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ctaId: string) => void;
}) {
  const ctasQuery = useCtasQuery();
  const ctas = (ctasQuery.data ?? []).filter((c) => c.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert a CTA</DialogTitle>
          <DialogDescription>
            Placed at the current cursor position. Manage CTAs from Blog → CTAs.
          </DialogDescription>
        </DialogHeader>
        {ctas.length === 0 ? (
          <EmptyState
            icon={MousePointerClick}
            title="No active CTAs"
            description="Create one from the Blog CTAs page first."
          />
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {ctas.map((cta) => (
              <button
                key={cta.id}
                type="button"
                className="hover:bg-accent w-full rounded-lg border p-3 text-left"
                onClick={() => {
                  onSelect(cta.id);
                  onOpenChange(false);
                }}
              >
                <div className="text-sm font-medium">{cta.title}</div>
                <div className="text-muted-foreground text-xs">
                  {cta.buttonText} → {cta.buttonUrl}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
