import type { LucideIcon } from 'lucide-react';

// Same order as the project Overview stat cards: icon, then label, then the value underneath.
export default function JobSummaryMetric({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="bg-secondary/30 border-border/60 min-w-0 space-y-4 rounded-2xl border p-4 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h3 className="text-muted-foreground truncate text-sm font-medium">
          {label}
        </h3>
      </div>
      <div>
        <p className="text-foreground text-lg font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {description && (
          <p className="text-muted-foreground/75 mt-0.5 text-[11px] leading-tight font-normal">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
