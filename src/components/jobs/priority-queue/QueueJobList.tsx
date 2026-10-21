import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ArrowRight, GripVertical, Pencil, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { PriorityQueueJobDisplay } from '@/types/priorityQueue';
import type { QueueJobDraft, QueueJobOption } from './QueueJobInlineEditor';

const QUEUE_GRID_CLASS =
  'grid min-w-[900px] grid-cols-[4.5rem_minmax(13rem,1.5fr)_minmax(12rem,1.2fr)_8rem_8rem_5.5rem_9rem]';

function formatWindow(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hours = min / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`;
}

function StatusBadge({ queueJob }: { queueJob: PriorityQueueJobDisplay }) {
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
function hasPendingWork(queueJob: PriorityQueueJobDisplay): boolean {
  return (
    queueJob.job?.checkpointPage != null || queueJob.job?.syncAllPage != null
  );
}

export default function QueueJobList<T extends PriorityQueueJobDisplay>({
  queueJobs,
  onReorderLocal,
  onEdit,
  onToggleEnabled,
  onRetry,
  onRemove,
  composer,
  drafts = [],
  jobs = [],
  onRemoveDraft,
  draftsBusy = false,
  editingQueueJobId = null,
}: {
  queueJobs: T[];
  onReorderLocal: (reordered: T[]) => void;
  onEdit: (queueJob: T) => void;
  onToggleEnabled: (queueJob: T) => void;
  onRetry: (queueJobId: string) => void;
  onRemove: (queueJobId: string) => void;
  composer?: ReactNode;
  drafts?: QueueJobDraft[];
  jobs?: QueueJobOption[];
  onRemoveDraft?: (draftId: string) => void;
  draftsBusy?: boolean;
  editingQueueJobId?: string | null;
}) {
  const listLocked = editingQueueJobId !== null;
  const onDragEnd = (result: DropResult) => {
    if (listLocked) return;
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
            {composer}
            {queueJobs.length === 0 && drafts.length === 0 && (
              <div className="text-muted-foreground px-4 py-8 text-center text-xs">
                No jobs have been added to the priority queue yet.
              </div>
            )}
            {queueJobs.map((queueJob, index) => (
              <Draggable
                key={queueJob.id}
                draggableId={queueJob.id}
                index={index}
                isDragDisabled={listLocked}
              >
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                    className={cn(
                      QUEUE_GRID_CLASS,
                      'items-center border-t text-xs transition-colors',
                      listLocked
                        ? 'bg-muted/50 opacity-60'
                        : 'bg-card hover:bg-muted/40',
                      snapshot.isDragging &&
                        'ring-ring rounded-4xl shadow-sm ring-2',
                    )}
                    role="row"
                    aria-disabled={listLocked}
                  >
                    <div
                      className="flex items-center gap-1 px-2 py-1.5"
                      role="cell"
                    >
                      <button
                        type="button"
                        {...dragProvided.dragHandleProps}
                        disabled={listLocked}
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
                        disabled={listLocked}
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
                          disabled={listLocked}
                          onClick={() => onRetry(queueJob.id)}
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={listLocked}
                        onClick={() => onEdit(queueJob)}
                        aria-label={`Edit ${queueJob.job?.name ?? 'job'}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={listLocked}
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
            {drafts.map((draft, index) => {
              const job = jobs.find((option) => option.id === draft.jobId);
              return (
                <div
                  key={draft.draftId}
                  className={cn(
                    QUEUE_GRID_CLASS,
                    'bg-primary/5 animate-in fade-in-0 slide-in-from-top-2 items-center border-t text-xs duration-200',
                  )}
                  role="row"
                >
                  <div className="px-3 py-2 text-right" role="cell">
                    {queueJobs.length + index + 1}
                  </div>
                  <div className="min-w-0 px-2 py-2 font-medium" role="cell">
                    <span className="truncate">{job?.name ?? draft.jobId}</span>
                  </div>
                  <div
                    className="text-muted-foreground min-w-0 truncate px-2 py-2"
                    role="cell"
                  >
                    {job ? `${job.sourceObject} → ${job.destObject}` : '—'}
                  </div>
                  <div className="px-2 py-2" role="cell">
                    <span className="text-muted-foreground">Pending save</span>
                  </div>
                  <div className="px-2 py-2" role="cell">
                    {draft.executionWindowMinutes} min
                  </div>
                  <div className="flex justify-center px-2 py-2" role="cell">
                    <Switch
                      size="sm"
                      checked={draft.enabled}
                      disabled
                      aria-label={`Enabled for new ${job?.name ?? 'job'}`}
                    />
                  </div>
                  <div className="flex justify-center px-2 py-2" role="cell">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      disabled={draftsBusy || listLocked}
                      onClick={() => onRemoveDraft?.(draft.draftId)}
                      aria-label={`Remove new ${job?.name ?? 'job'}`}
                      className="border-destructive/40 text-destructive border-dashed"
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
