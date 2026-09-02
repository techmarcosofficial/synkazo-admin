import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useAssociationRuleOptionsQuery,
  useUpdateAssociationConfigMutation,
} from '@/queries/usePriorityQueue';
import type { AssociationQueueItem, ProjectQueue } from '@/types';

interface LocalItem {
  associationRuleId: string;
  enabled: boolean;
}

export default function AssociationQueueCard({
  projectId,
  queue,
  items,
}: {
  projectId: string;
  queue: ProjectQueue | null;
  items: AssociationQueueItem[];
}) {
  const optionsQuery = useAssociationRuleOptionsQuery(projectId);
  const updateMutation = useUpdateAssociationConfigMutation(projectId);

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
  const [addingRuleId, setAddingRuleId] = useState('');

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

  const delayMinutes = delayUnit === 'hours' ? delayAmount * 60 : delayAmount;

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

  const addRule = (associationRuleId: string) => {
    if (
      !associationRuleId ||
      localItems.some((i) => i.associationRuleId === associationRuleId)
    )
      return;
    setLocalItems((prev) => [...prev, { associationRuleId, enabled: true }]);
    setAddingRuleId('');
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

  const handleSave = () => {
    updateMutation.mutate(
      {
        enabled,
        delayMinutes,
        items: localItems.map((i, index) => ({
          associationRuleId: i.associationRuleId,
          position: index,
          enabled: i.enabled,
        })),
      },
      { onSuccess: () => setDirty(false) },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Association Queue</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Runs the selected association rules sequentially, after every job
            in the queue has finished its pending sync work.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            markDirty();
          }}
        />
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium">
              Delay After Jobs Complete
            </label>
            <Input
              type="number"
              min={0}
              value={delayAmount}
              onChange={(e) => {
                setDelayAmount(Math.max(0, Number(e.target.value)));
                markDirty();
              }}
              className="w-24 font-mono"
            />
            <Select
              value={delayUnit}
              onValueChange={(v) => {
                setDelayUnit(v as 'minutes' | 'hours');
                markDirty();
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutes</SelectItem>
                <SelectItem value="hours">hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {localItems.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No association rules added to the queue yet.
            </p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="association-queue">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
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
                                'bg-card flex items-center gap-3 rounded-lg border px-3 py-2',
                                snapshot.isDragging && 'ring-paused/40 ring-2',
                              )}
                            >
                              <div
                                {...dragProvided.dragHandleProps}
                                className="text-muted-foreground shrink-0 cursor-grab"
                              >
                                <GripVertical className="size-4" />
                              </div>
                              <div className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">
                                  {rule?.name ?? item.associationRuleId}
                                </p>
                                {rule && (
                                  <p className="text-muted-foreground truncate text-xs">
                                    {rule.sourceObject} → {rule.targetObject}
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={item.enabled}
                                onCheckedChange={() =>
                                  toggleRule(item.associationRuleId)
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  removeRule(item.associationRuleId)
                                }
                              >
                                <X />
                              </Button>
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

          <div className="flex items-center gap-2">
            <Select value={addingRuleId} onValueChange={addRule}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Add an association rule…" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.sourceObject} → {r.targetObject})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Plus className="text-muted-foreground size-4" />
          </div>

          {dirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Spinner /> : <Save />}
              Save Association Queue
            </Button>
          )}
        </CardContent>
      )}

      {!enabled && dirty && (
        <CardContent>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Spinner /> : <Save />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
