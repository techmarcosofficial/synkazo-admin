import { ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ModuleCardMetric {
  icon: LucideIcon;
  label: string;
}

export type ModuleCardTone =
  'primary' | 'info' | 'success' | 'warning' | 'paused';

const TONE_CLASSES: Record<
  ModuleCardTone,
  { iconBg: string; icon: string; action: string }
> = {
  primary: {
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
    action: 'text-primary',
  },
  info: { iconBg: 'bg-info/10', icon: 'text-info', action: 'text-info' },
  success: {
    iconBg: 'bg-success/10',
    icon: 'text-success',
    action: 'text-success',
  },
  warning: {
    iconBg: 'bg-warning/10',
    icon: 'text-warning',
    action: 'text-warning',
  },
  paused: {
    iconBg: 'bg-paused/10',
    icon: 'text-paused',
    action: 'text-paused',
  },
};

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  tone: ModuleCardTone;
  metrics?: ModuleCardMetric[];
}

export default function ModuleCard({
  title,
  description,
  icon: Icon,
  to,
  tone,
  metrics = [],
}: ModuleCardProps) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <Link to={to} className="block h-full">
      <Card
        className={cn(
          'h-full cursor-pointer py-0 transition-transform duration-200',
          'hover:-translate-y-px',
        )}
      >
        <CardContent className="flex flex-1 flex-col gap-4 pt-6">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-xl',
                toneClasses.iconBg,
              )}
            >
              <Icon className={cn('size-5', toneClasses.icon)} />
            </div>
            <ChevronRight className="text-muted-foreground/60 size-4" />
          </div>

          <div className="space-y-1">
            <p className="font-heading text-base font-semibold">{title}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          {metrics.length > 0 && (
            <div className="mt-auto space-y-2 border-t pt-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                >
                  <metric.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{metric.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end border-t py-4">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              toneClasses.action,
            )}
          >
            Manage
            <ArrowRight className="size-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
