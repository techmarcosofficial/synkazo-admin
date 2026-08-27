import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type {
  ProjectHealthIssue,
  ProjectHealthLevel,
} from '@/features/projects/lib/projectSetupState';
import { cn } from '@/lib/utils';

interface ProjectHealthSummaryProps {
  level: ProjectHealthLevel;
  issues: ProjectHealthIssue[];
}

const LEVEL_CONFIG: Record<
  ProjectHealthLevel,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    bgClass: string;
    label: string;
    description: string;
  }
> = {
  healthy: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    bgClass: 'bg-success/10',
    label: 'Healthy',
    description: 'All systems operational.',
  },
  degraded: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10',
    label: 'Attention',
    description: 'Some issues need review.',
  },
  unhealthy: {
    icon: AlertOctagon,
    iconClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    label: 'Critical',
    description: 'Sync is impacted.',
  },
};

export default function ProjectHealthSummary({
  level,
  issues,
}: ProjectHealthSummaryProps) {
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            cfg.bgClass,
          )}
        >
          <Icon className={cn('size-5', cfg.iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{cfg.label}</CardTitle>
            {issues.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {issues.length} issue{issues.length > 1 ? 's' : ''} need
                attention
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {cfg.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
