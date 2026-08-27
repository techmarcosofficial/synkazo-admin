import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors a two-column card grid (e.g. project cards on ProjectsList).
export default function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-[30px] rounded-lg" />
                <Skeleton className="size-[18px] rounded-full" />
                <Skeleton className="size-[30px] rounded-lg" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex items-center gap-6 border-t pt-4">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
