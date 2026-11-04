import type { LucideIcon } from 'lucide-react';

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
    <div className="bg-secondary/30 border-border/60 min-w-0 space-y-1.5 rounded-2xl border p-4 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        <Icon className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
      </div>
      <div>
        <p className="text-foreground text-lg sm:text-xl font-bold tracking-tight tabular-nums">
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
