import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonStatGrid />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent className="p-0">
            <SkeletonList count={4} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-14" />
          </CardHeader>
          <CardContent className="p-0">
            <SkeletonList count={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
