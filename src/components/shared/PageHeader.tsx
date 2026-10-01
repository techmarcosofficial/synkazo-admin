import { ChevronLeft } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import AccountContextAlert from '@/components/shared/AccountContextAlert';
import HeadingPair from '@/components/shared/HeadingPair';
import { cn } from '@/lib/utils';
import { useHeaderStore } from '@/stores/useHeaderStore';

interface PageHeaderProps {
  title: string;
  greeting?: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  showAccountContextAlert?: boolean;
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
  greeting,
  description,
  actions,
  badge,
  backTo,
  showAccountContextAlert = true,
}: PageHeaderProps) {
  const storeActions = useHeaderStore((s) => s.actions);

  const hasActions = actions || storeActions;

  return (
    <>
      <header className={cn('w-full', backTo ? 'space-y-4' : 'space-y-3')}>
        {backTo && <BackLink label={backTo.label} to={backTo.to} />}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 lg:gap-8">
          {/* Left */}
          {backTo ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {badge}
              </div>

              {description && (
                <p className="text-muted-foreground mt-1.5 max-w-3xl text-sm leading-5">
                  {description}
                </p>
              )}
            </div>
          ) : greeting ? (
            <div
              className={cn(
                'min-w-0',
                hasActions ? 'max-w-md shrink-0' : 'max-w-2xl flex-1',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <h1 className="min-w-0 flex-1">
                  <span className="text-muted-foreground block text-xs sm:text-sm leading-5">
                    {greeting},
                  </span>
                  <span className="text-foreground mt-0.5 block text-2xl sm:text-[28px] leading-tight font-bold tracking-tight [overflow-wrap:anywhere]">
                    {title}
                  </span>
                </h1>
                {badge}
              </div>
              {description && (
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm leading-5">
                  {description}
                </p>
              )}
            </div>
          ) : (
            <HeadingPair
              level="h1"
              title={title}
              subtitle={description}
              trailing={badge}
              className="max-w-3xl flex-1"
            />
          )}

          {/* Right */}
          {hasActions && (
            <div className="flex w-full flex-1 items-center justify-start md:justify-end">
              {actions}
              {storeActions}
            </div>
          )}
        </div>
      </header>
      {showAccountContextAlert && <AccountContextAlert />}
    </>
  );
}
