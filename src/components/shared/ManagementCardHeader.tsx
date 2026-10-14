import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import HeadingPair from '@/components/shared/HeadingPair';
import { Badge } from '@/components/ui/badge';

interface ManagementCardHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  action?: ReactNode;
  count: number;
  countLabel: string;
  isLoading?: boolean;
  children: ReactNode;
}

/** Page identity and primary action for a management directory. */
export default function ManagementCardHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  count,
  countLabel,
  isLoading = false,
  children,
}: ManagementCardHeaderProps) {
  return (
    <header className="min-w-0">
      {action && (
        <div className="relative z-0 flex h-14 justify-end [&_[data-slot=button]]:h-14 [&_[data-slot=button]]:rounded-t-2xl [&_[data-slot=button]]:rounded-b-none [&_[data-slot=button]]:pb-5 [&>span]:h-14">
          {action}
        </div>
      )}
      <div
        className={`bg-card border-border/70 relative z-10 rounded-3xl border px-3 py-3 shadow-sm sm:px-4 ${action ? '-mt-5' : ''}`}
      >
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-4" aria-hidden />
            </span>
            <HeadingPair
              level="h1"
              visualLevel="page"
              title={title}
              subtitle={subtitle}
              trailing={
                <Badge
                  variant="secondary"
                  aria-label={
                    isLoading
                      ? `${countLabel} loading`
                      : `${count} ${countLabel} total`
                  }
                >
                  {isLoading ? '…' : count}
                </Badge>
              }
            />
          </div>
          <div className="min-w-0 xl:justify-self-end">{children}</div>
        </div>
      </div>
    </header>
  );
}
