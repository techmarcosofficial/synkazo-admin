import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

// Generic row/column skeleton for table-style pages (logs, audit, jobs).
export default function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('divide-y', className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-4', c === 0 ? 'w-1/4 shrink-0' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
