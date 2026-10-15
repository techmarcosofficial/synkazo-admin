import { Check, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import QueueOptionPicker from './QueueOptionPicker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AssociationRuleOption } from '@/types/priorityQueue';

export interface AssociationQueueDraft {
  associationRuleId: string;
  enabled: boolean;
}

interface DraftRow extends AssociationQueueDraft {
  id: string;
}

const ROW_GRID =
  'grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3';

function emptyRow(): DraftRow {
  return {
    id: `association-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    associationRuleId: '',
    enabled: true,
  };
}

export default function AssociationQueueComposer({
  open,
  onClose,
  options,
  existingRuleIds,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  options: AssociationRuleOption[];
  existingRuleIds: string[];
  onApply: (items: AssociationQueueDraft[]) => void;
}) {
  const [rows, setRows] = useState<DraftRow[]>([]);

  useEffect(() => {
    if (open) setRows([emptyRow()]);
    else setRows([]);
  }, [open]);

  if (!open) return null;

  const selectedIds = new Set([
    ...existingRuleIds,
    ...rows.map((row) => row.associationRuleId).filter(Boolean),
  ]);
  const canAdd = options.some((option) => !selectedIds.has(option.id));
  const canApply =
    rows.length > 0 && rows.every((row) => row.associationRuleId);

  return (
    <div className="bg-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-top-2 border-b p-4 shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-lg">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-xs font-semibold">Add association rules</span>
          <span className="text-muted-foreground text-xs">
            — Select rules, then apply
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={() => {
              onApply(
                rows.map(({ associationRuleId, enabled }) => ({
                  associationRuleId,
                  enabled,
                })),
              );
              onClose();
            }}
            className="h-8 text-xs"
          >
            <Check className="size-3.5" /> Apply ({rows.length})
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close association rule editor"
            className="text-muted-foreground hover:text-foreground ml-1"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`${ROW_GRID} animate-in fade-in-0 slide-in-from-top-2 duration-200`}
          >
            <Badge variant="secondary" size="xs">
              New
            </Badge>
            <div className="min-w-0">
              <QueueOptionPicker
                ariaLabel={`Choose association rule in row ${index + 1}`}
                value={row.associationRuleId}
                placeholder="Choose association rule…"
                searchPlaceholder="Search association rules…"
                options={options
                  .filter(
                    (option) =>
                      option.id === row.associationRuleId ||
                      !selectedIds.has(option.id),
                  )
                  .map((option) => ({
                    value: option.id,
                    label: option.name,
                    detail: `${option.sourceObject} → ${option.targetObject}`,
                  }))}
                onChange={(associationRuleId) =>
                  setRows((current) =>
                    current.map((candidate) =>
                      candidate.id === row.id
                        ? { ...candidate, associationRuleId }
                        : candidate,
                    ),
                  )
                }
              />
            </div>
            <Switch
              size="sm"
              className="justify-self-center"
              checked={row.enabled}
              onCheckedChange={(enabled) =>
                setRows((current) =>
                  current.map((candidate) =>
                    candidate.id === row.id
                      ? { ...candidate, enabled }
                      : candidate,
                  ),
                )
              }
              aria-label={`Enable association rule row ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              className="border-destructive/40 bg-background text-destructive hover:border-destructive hover:bg-destructive/10 size-7 justify-self-end rounded-lg border-dashed shadow-xs"
              aria-label={`Remove new association rule row ${index + 1}`}
              onClick={() => {
                if (rows.length <= 1) onClose();
                else
                  setRows((current) =>
                    current.filter((candidate) => candidate.id !== row.id),
                  );
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <div className={`${ROW_GRID} pt-0.5`}>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={!canAdd}
            onClick={() => setRows((current) => [...current, emptyRow()])}
            title="Add association rule row"
            aria-label="Add association rule row"
            className="border-primary/40 bg-background text-primary hover:border-primary hover:bg-primary/10 col-start-4 size-7 justify-self-end rounded-lg border-dashed shadow-xs"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
