import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { UpdateAssociationQueuePayload } from '@/api/priorityQueue';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import AssociationQueueComposer, {
  type AssociationQueueDraft,
} from './AssociationQueueComposer';
import { useAssociationRuleOptionsQuery } from '@/queries/usePriorityQueue';
import type { AssociationQueueItem, ProjectQueue } from '@/types';

interface LocalItem {
  associationRuleId: string;
  enabled: boolean;
}

const ASSOCIATION_GRID_CLASS =
  'grid min-w-[720px] grid-cols-[4.25rem_minmax(13rem,1.2fr)_minmax(13rem,1fr)_5.5rem_5rem]';

export default function AssociationQueueCard({
  projectId,
  queue,
  items,
  onChange,
  savedRevision,
}: {
  projectId: string;
  queue: ProjectQueue | null;
  items: AssociationQueueItem[];
  onChange: (draft: UpdateAssociationQueuePayload) => void;
  savedRevision: number;
}) {
  const optionsQuery = useAssociationRuleOptionsQuery(projectId);

  const [enabled, setEnabled] = useState(
    queue?.associationQueueEnabled ?? false,
  );
  const [delayAmount, setDelayAmount] = useState(
    queue?.associationDelayMinutes ? queue.associationDelayMinutes : 0,
  );
  const [delayUnit, setDelayUnit] = useState<'minutes' | 'hours'>('minutes');
  const [localItems, setLocalItems] = useState<LocalItem[]>(
    items.map((i) => ({
      associationRuleId: i.associationRuleId,
      enabled: i.enabled,
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setEnabled(queue?.associationQueueEnabled ?? false);
    setLocalItems(
      items.map((i) => ({
        associationRuleId: i.associationRuleId,
        enabled: i.enabled,
      })),
    );
  }, [queue, items]);

  useEffect(() => {
    setDirty(false);
  }, [savedRevision]);

  const delayMinutes = delayUnit === 'hours' ? delayAmount * 60 : delayAmount;

  useEffect(() => {
    if (!dirty) return;
    onChange({
      enabled,
      delayMinutes,
      items: localItems.map((item, position) => ({ ...item, position })),
    });
  }, [dirty, enabled, delayMinutes, localItems, onChange]);

  const ruleOptions = optionsQuery.data ?? [];
  const ruleById = new Map(ruleOptions.map((r) => [r.id, r]));
  const availableOptions = ruleOptions.filter(
    (r) => !localItems.some((i) => i.associationRuleId === r.id),
  );

  const markDirty = () => setDirty(true);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(localItems);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalItems(reordered);
    markDirty();
  };

  const addRules = (drafts: AssociationQueueDraft[]) => {
    setLocalItems((current) => [...current, ...drafts]);
    markDirty();
  };

  const removeRule = (associationRuleId: string) => {
    setLocalItems((prev) =>
      prev.filter((i) => i.associationRuleId !== associationRuleId),
    );
    markDirty();
  };

  const toggleRule = (associationRuleId: string) => {
    setLocalItems((prev) =>
      prev.map((i) =>
        i.associationRuleId === associationRuleId
          ? { ...i, enabled: !i.enabled }
          : i,
      ),
    );
    markDirty();
  };

  return (
    <section
      className="space-y-3 border-t px-4 py-4"
      aria-label="Association queue rules"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">
                Step 2 · Association Queue
              </h3>
              <span className="text-muted-foreground text-xs">
                {localItems.length} configured{' '}
                {localItems.length === 1 ? 'rule' : 'rules'}
              </span>
              {!enabled && (
                <span className="text-muted-foreground text-xs">· Off</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Runs after the Priority Queue completes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={composerOpen || availableOptions.length === 0}
              onClick={() => setComposerOpen(true)}
            >
              <Plus /> Add rule
            </Button>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              markDirty();
            }}
            aria-label="Enable association queue"
          />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
            <label className="mr-auto text-xs font-medium">
              Wait before association rules
            </label>
            <Input
              type="number"
              min={0}
              value={delayAmount}
              onChange={(e) => {
                setDelayAmount(Math.max(0, Number(e.target.value)));
                markDirty();
              }}
              uiSize="sm"
              className="w-24 font-mono"
            />
            <Select
              value={delayUnit}
              onValueChange={(v) => {
                setDelayUnit(v as 'minutes' | 'hours');
                markDirty();
              }}
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutes</SelectItem>
                <SelectItem value="hours">hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {localItems.length === 0 && !composerOpen ? (
            <p className="text-muted-foreground rounded-3xl border py-6 text-center text-xs">
              No association rules added to the queue yet.
            </p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="association-queue">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="overflow-x-auto rounded-3xl border"
                    role="table"
                    aria-label="Association queue rules"
                  >
                    <div
                      className={cn(
                        ASSOCIATION_GRID_CLASS,
                        'bg-muted items-center text-xs font-medium',
                      )}
                      role="row"
                    >
                      <div className="px-3 py-2 text-right" role="columnheader">
                        #
                      </div>
                      <div className="px-2 py-2" role="columnheader">
                        Association Rule
                      </div>
                      <div className="px-2 py-2" role="columnheader">
                        Source → Destination
                      </div>
                      <div
                        className="px-2 py-2 text-center"
                        role="columnheader"
                      >
                        Enabled
                      </div>
                      <div
                        className="px-2 py-2 text-center"
                        role="columnheader"
                      >
                        Actions
                      </div>
                    </div>
                    <AssociationQueueComposer
                      open={composerOpen}
                      onClose={() => setComposerOpen(false)}
                      options={ruleOptions}
                      existingRuleIds={localItems.map(
                        (item) => item.associationRuleId,
                      )}
                      onApply={addRules}
                    />
                    {localItems.map((item, index) => {
                      const rule = ruleById.get(item.associationRuleId);
                      return (
                        <Draggable
                          key={item.associationRuleId}
                          draggableId={item.associationRuleId}
                          index={index}
                        >
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              style={dragProvided.draggableProps.style}
                              className={cn(
                                ASSOCIATION_GRID_CLASS,
                                'bg-card hover:bg-muted/40 items-center border-t text-xs transition-colors',
                                snapshot.isDragging &&
                                  'ring-ring rounded-2xl shadow-sm ring-2',
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
                                  aria-label={`Reorder ${rule?.name ?? 'association rule'}`}
                                >
                                  <GripVertical className="size-4" />
                                </button>
                                <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md font-semibold">
                                  {index + 1}
                                </span>
                              </div>
                              <div
                                className="truncate px-2 py-1.5 text-sm font-medium"
                                role="cell"
                              >
                                {rule?.name ?? item.associationRuleId}
                              </div>
                              <div
                                className="text-muted-foreground truncate px-2 py-1.5"
                                role="cell"
                              >
                                {rule
                                  ? `${rule.sourceObject} → ${rule.targetObject}`
                                  : '—'}
                              </div>
                              <div
                                className="flex justify-center px-2 py-1.5"
                                role="cell"
                              >
                                <Switch
                                  size="sm"
                                  checked={item.enabled}
                                  onCheckedChange={() =>
                                    toggleRule(item.associationRuleId)
                                  }
                                  aria-label={`Toggle ${rule?.name ?? 'association rule'}`}
                                />
                              </div>
                              <div
                                className="flex justify-center px-2 py-1.5"
                                role="cell"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() =>
                                    removeRule(item.associationRuleId)
                                  }
                                  aria-label={`Remove ${rule?.name ?? 'association rule'}`}
                                >
                                  <X />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      )}
    </section>
  );
}
