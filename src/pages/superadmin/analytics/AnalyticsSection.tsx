import type { ReactNode } from 'react';
import HeadingPair from '@/components/shared/HeadingPair';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsSection({
  title,
  description,
  action,
  loading,
  error,
  children,
  className = '',
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card surface="outer" size="sm" className={`min-w-0 ${className}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <HeadingPair
            title={title}
            subtitle={description}
            visualLevel="card"
          />
          {action}
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {loading ? (
          <div
            role="status"
            aria-label={`Loading ${title}`}
            className="space-y-3"
          >
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : error ? (
          <p
            role="alert"
            className="bg-destructive/5 text-destructive rounded-2xl p-4 text-sm"
          >
            {error}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-52 items-center justify-center p-6 text-center text-sm">
      {children}
    </div>
  );
}
