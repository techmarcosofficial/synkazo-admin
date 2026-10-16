import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewKpiCard({
  title,
  value,
  note,
  icon: Icon,
  to,
  tone = 'primary',
  loading,
}: {
  title: string;
  value: string;
  note: string;
  icon: LucideIcon;
  to: string;
  tone?: 'primary' | 'success' | 'warning' | 'destructive';
  loading?: boolean;
}) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card
      size="sm"
      surface="outer"
      className="hover:bg-muted/30 relative p-3 transition-colors"
    >
      <Link
        to={to}
        onClick={(event) => {
          if (to.startsWith('#')) {
            event.preventDefault();
            document
              .getElementById(to.slice(1))
              ?.scrollIntoView({ block: 'start' });
          }
        }}
        className="focus-visible:ring-ring flex h-full flex-col gap-2 rounded-2xl outline-none focus-visible:ring-2"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${colors[tone]}`}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs leading-4">{title}</p>
            {loading ? (
              <Skeleton className="my-1 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl leading-7 font-semibold tracking-tight tabular-nums">
                {value}
              </p>
            )}
          </div>
          <ChevronRight className="text-muted-foreground mt-5 hidden size-3 shrink-0 sm:block" />
        </div>
        <p className="text-muted-foreground mt-auto text-xs leading-4">
          {note}
        </p>
      </Link>
    </Card>
  );
}
