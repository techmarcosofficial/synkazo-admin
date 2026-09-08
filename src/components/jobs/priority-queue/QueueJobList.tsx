import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ArrowRight, GripVertical, Pencil, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { QueueJob } from '@/types';

const QUEUE_GRID_CLASS =
  'grid min-w-[920px] grid-cols-[4.25rem_minmax(13rem,1.5fr)_minmax(12rem,1.2fr)_8rem_8rem_5.5rem_9rem]';

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
    <Badge
      className={cn(
        'gap-1.5 capitalize',
        queueJob.lastExecutionStatus
          ? 'bg-muted text-muted-foreground'
          : 'bg-success/10 text-success',
      )}
    >
      {!queueJob.lastExecutionStatus && (
        <span className="bg-success size-1.5 rounded-full" />
      )}
      {label}
    </Badge>
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
            className="overflow-x-auto rounded-4xl border"
            role="table"
            aria-label="Priority queue jobs"
          >
            <div
              className={cn(
                QUEUE_GRID_CLASS,
                'bg-muted items-center text-xs font-medium',
              )}
              role="row"
            >
              <div className="px-3 py-2 text-right" role="columnheader">
                #
              </div>
              <div className="px-2 py-2" role="columnheader">
                Job Name
              </div>
              <div className="px-2 py-2" role="columnheader">
                Source → Destination
              </div>
              <div className="px-2 py-2" role="columnheader">
                Status
              </div>
              <div className="px-2 py-2" role="columnheader">
                Execution Window
              </div>
              <div className="px-2 py-2 text-center" role="columnheader">
                Enabled
              </div>
              <div className="px-2 py-2 text-center" role="columnheader">
                Actions
              </div>
            </div>
            {queueJobs.map((queueJob, index) => (
              <Draggable
                key={queueJob.id}
                draggableId={queueJob.id}
                index={index}
              >
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                    className={cn(
                      QUEUE_GRID_CLASS,
                      'bg-card hover:bg-muted/40 items-center border-t text-xs transition-colors',
                      snapshot.isDragging &&
                        'ring-ring rounded-4xl shadow-sm ring-2',
                    )}
                    role="row"
                  >
                    <div
                      className="flex items-center gap-1 px-2 py-1.5"
                      role="cell"
                    >
                      <button
                        type="button"
                        {...dragProvided.dragHandleProps}
                        className="text-muted-foreground hover:bg-muted focus-visible:ring-ring/30 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-lg outline-none focus-visible:ring-3"
                        aria-label={`Reorder ${queueJob.job?.name ?? 'job'}`}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md font-semibold">
                        {index + 1}
                      </span>
                    </div>
                    <div
                      className="min-w-0 px-2 py-1.5 text-sm font-medium"
                      role="cell"
                    >
                      <span className="block truncate">
                        {queueJob.job?.name ?? 'Job'}
                      </span>
                      {hasPendingWork(queueJob) && (
                        <Badge
                          variant="outline"
                          className="mt-1"
                          title="Has pending records from a previous iteration"
                        >
                          Pending records
                        </Badge>
                      )}
                    </div>
                    <div
                      className="text-muted-foreground flex min-w-0 items-center gap-1 px-2 py-1.5"
                      role="cell"
                    >
                      <span className="truncate">
                        <span>{queueJob.job?.sourceObject}</span>
                        <ArrowRight className="mx-1 inline size-3" />
                        <span>{queueJob.job?.destObject}</span>
                      </span>
                    </div>
                    <div className="px-2 py-1.5" role="cell">
                      <StatusBadge queueJob={queueJob} />
                    </div>
                    <div
                      className="text-muted-foreground px-2 py-1.5"
                      role="cell"
                    >
                      {formatWindow(queueJob.executionWindowSec)}
                    </div>
                    <div
                      className="flex justify-center px-2 py-1.5"
                      role="cell"
                    >
                      <Switch
                        size="sm"
                        checked={queueJob.enabled}
                        onCheckedChange={() => onToggleEnabled(queueJob)}
                        aria-label={`Toggle ${queueJob.job?.name ?? 'job'}`}
                      />
                    </div>
                    <div
                      className="flex items-center justify-center gap-0.5 px-2 py-1.5"
                      role="cell"
                    >
                      {queueJob.blocked && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onRetry(queueJob.id)}
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(queueJob)}
                        aria-label={`Edit ${queueJob.job?.name ?? 'job'}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRemove(queueJob.id)}
                        aria-label={`Remove ${queueJob.job?.name ?? 'job'}`}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
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
