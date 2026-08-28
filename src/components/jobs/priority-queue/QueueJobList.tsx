import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ArrowRight, GripVertical, Pencil, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { QueueJob } from '@/types';

function formatWindow(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hours = min / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`;
}

function StatusBadge({ queueJob }: { queueJob: QueueJob }) {
  if (queueJob.blocked) {
    return (
      <Badge variant="destructive">
        Blocked · {queueJob.blockedReason ?? 'failures'}
      </Badge>
    );
  }
  if (!queueJob.enabled) return <Badge variant="secondary">Disabled</Badge>;
  const label = queueJob.lastExecutionStatus
    ? queueJob.lastExecutionStatus.replace(/_/g, ' ')
    : 'Enabled';
  return (
    <Badge className="bg-muted text-muted-foreground capitalize">{label}</Badge>
  );
}

// Reflects Job.checkpointPage/syncAllPage — the same "still has pending work this cycle"
// signal the backend's iteration draining reads (see baseline.util.ts:jobHasPendingWork).
function hasPendingWork(queueJob: QueueJob): boolean {
  return (
    queueJob.job?.checkpointPage != null || queueJob.job?.syncAllPage != null
  );
}

export default function QueueJobList({
  queueJobs,
  onReorderLocal,
  onEdit,
  onToggleEnabled,
  onRetry,
  onRemove,
}: {
  queueJobs: QueueJob[];
  onReorderLocal: (reordered: QueueJob[]) => void;
  onEdit: (queueJob: QueueJob) => void;
  onToggleEnabled: (queueJob: QueueJob) => void;
  onRetry: (queueJobId: string) => void;
  onRemove: (queueJobId: string) => void;
}) {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(queueJobs);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onReorderLocal(reordered);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="priority-queue">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {queueJobs.map((queueJob, index) => (
              <Draggable
                key={queueJob.id}
                draggableId={queueJob.id}
                index={index}
              >
                {(dragProvided, snapshot) => (
                  <Card
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                    className={cn(
                      'flex-row items-center gap-3 px-4 py-3',
                      snapshot.isDragging && 'ring-paused/40 ring-2',
                    )}
                  >
                    <div
                      {...dragProvided.dragHandleProps}
                      className="text-muted-foreground shrink-0 cursor-grab"
                    >
                      <GripVertical className="size-4" />
                    </div>
                    <div className="bg-paused/10 text-paused flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {queueJob.job?.name ?? 'Job'}
                        </span>
                        <StatusBadge queueJob={queueJob} />
                        {hasPendingWork(queueJob) && (
                          <Badge
                            variant="outline"
                            className="border-paused/40 text-paused"
                            title="Has pending records from a previous iteration"
                          >
                            Pending records
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                        <span>{queueJob.job?.sourceObject}</span>
                        <ArrowRight size={13} />
                        <span>{queueJob.job?.destObject}</span>
                        <span className="ml-2">
                          Execution Window:{' '}
                          {formatWindow(queueJob.executionWindowSec)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {queueJob.blocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRetry(queueJob.id)}
                        >
                          Retry
                        </Button>
                      )}
                      <Switch
                        checked={queueJob.enabled}
                        onCheckedChange={() => onToggleEnabled(queueJob)}
                        aria-label="Toggle enabled"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(queueJob)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemove(queueJob.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
