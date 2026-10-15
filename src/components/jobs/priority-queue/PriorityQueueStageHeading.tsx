import { ArrowRight } from 'lucide-react';

import HeadingPair from '@/components/shared/HeadingPair';
import { Badge } from '@/components/ui/badge';

export default function PriorityQueueStageHeading() {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <HeadingPair
        level="h3"
        titleId="priority-queues-title"
        title="Priority and association queues"
        subtitle="Configure when the queue starts and the order each stage runs."
      />
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Execution order: Priority Queue, then Association Queue"
      >
        <Badge
          variant="secondary"
          className="size-6 rounded-full p-0 font-semibold"
        >
          1
        </Badge>
        <span className="text-xs font-medium">Priority Queue</span>
        <ArrowRight className="text-muted-foreground size-3.5" aria-hidden />
        <Badge
          variant="secondary"
          className="size-6 rounded-full p-0 font-semibold"
        >
          2
        </Badge>
        <span className="text-xs font-medium">Association Queue</span>
      </div>
    </div>
  );
}
