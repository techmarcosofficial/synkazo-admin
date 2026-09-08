import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-[88px] w-full" />
                <Skeleton className="h-4 w-44 max-w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <CardAction>
            <Skeleton className="h-9 w-24" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card size="sm" className="border">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <div className="mt-3 flex items-end justify-between gap-4">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-4 h-4 w-40" />
                <Skeleton className="h-[260px] w-full" />
              </CardContent>
            </Card>
            <Card size="sm" className="border">
              <CardHeader>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <div className="mt-3 flex items-end justify-between gap-4">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-4 h-4 w-56 max-w-full" />
                <Skeleton className="h-[260px] w-full" />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-14" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 py-3">
                <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-5 w-56 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
