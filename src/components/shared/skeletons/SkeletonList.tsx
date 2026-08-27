import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonListProps {
  count?: number;
  className?: string;
}

// Mirrors a divide-y row list (e.g. connections list, recent activity feed).
export default function SkeletonList({
  count = 5,
  className,
}: SkeletonListProps) {
  return (
    <ul className={cn('divide-y', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-4 px-5 py-3.5"
        >
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
