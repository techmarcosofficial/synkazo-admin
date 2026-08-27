import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SetupProgressProps {
  label: string;
  percent: number;
  className?: string;
}

// Shared bar + label so the dialog's sidebar and the ProjectDetail banner
// render one consistent progress visual, even though each phrases its label
// differently ("Step 2 of 3" vs "1 of 3 steps complete").
export default function SetupProgress({
  label,
  percent,
  className,
}: SetupProgressProps) {
  return (
    <div className={cn(className)}>
      <div className="text-muted-foreground mb-1.5 text-xs font-medium">
        {label}
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}
