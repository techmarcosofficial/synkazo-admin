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
  description: string;
}) {
  return (
    <div className="bg-secondary/40 border-border/60 min-w-0 space-y-2 rounded-2xl border p-4 transition-colors">
      <span className="bg-background text-muted-foreground border-border/40 flex size-8 items-center justify-center rounded-xl border">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-base leading-tight font-bold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs font-medium">
          {label}
        </p>
        <p className="text-muted-foreground/80 mt-0.5 text-[11px] leading-tight font-normal">
          {description}
        </p>
      </div>
    </div>
  );
}
