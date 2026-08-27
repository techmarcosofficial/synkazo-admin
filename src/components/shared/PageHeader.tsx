import { ChevronLeft } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useHeaderStore } from '@/stores/useHeaderStore';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  backTo?: {
    label: string;
    to: string;
  };
}

export function BackLink({
  label,
  to,
  className,
}: {
  label: string;
  to: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors',
        className,
      )}
    >
      <ChevronLeft className="size-3.5" />
      {label}
    </Link>
  );
}

export default function PageHeader({
  title,
  description,
  actions,
  badge,
  backTo,
}: PageHeaderProps) {
  const storeActions = useHeaderStore((s) => s.actions);

  const hasActions = actions || storeActions;

  return (
    <header className="w-full space-y-4">
      {backTo && <BackLink label={backTo.label} to={backTo.to} />}

      <div className="flex gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {badge}
          </div>

          {description && (
            <p className="text-muted-foreground mt-2 text-sm">{description}</p>
          )}
        </div>

        {/* Right */}
        {hasActions && (
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 md:justify-end">
            {actions}
            {storeActions}
          </div>
        )}
      </div>
    </header>
  );
}
