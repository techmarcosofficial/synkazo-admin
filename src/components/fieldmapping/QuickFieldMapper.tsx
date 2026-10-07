import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronsUpDown,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { FieldDef, MappingRow } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { matchFields } from '@/lib/fieldMatching';
import { cn } from '@/lib/utils';

export interface QuickFieldMapperProps {
  sourceFields: FieldDef[];
  destFields: FieldDef[];
  mappings: MappingRow[];
  onMap?: (source: FieldDef, dest: FieldDef) => void;
  onMapBatch?: (pairs: Array<{ source: FieldDef; dest: FieldDef }>) => void;
  onClose: () => void;
  sourcePlatformLabel: string;
  destPlatformLabel: string;
  readOnlyKeys?: Set<string>;
}

export interface QuickMapDraftRow {
  id: string;
  sourceKey: string;
  destKey: string;
}

const createEmptyRow = (): QuickMapDraftRow => ({
  id: `qmr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sourceKey: '',
  destKey: '',
});

export default function QuickFieldMapper({
  sourceFields,
  destFields,
  mappings,
  onMap,
  onMapBatch,
  onClose,
  sourcePlatformLabel,
  destPlatformLabel,
  readOnlyKeys = new Set(),
}: QuickFieldMapperProps) {
  const [rows, setRows] = useState<QuickMapDraftRow[]>([createEmptyRow()]);
  const [openPopover, setOpenPopover] = useState<{
    rowId: string;
    type: 'source' | 'dest';
  } | null>(null);

  // Set of already mapped destination keys in canvas
  const mappedDestKeys = useMemo(() => {
    const set = new Set<string>();
    mappings.forEach((m) => {
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      dests.forEach((d) => set.add(d));
    });
    return set;
  }, [mappings]);

  // Set of already mapped source keys in canvas
  const mappedSourceKeys = useMemo(() => {
    return new Set(mappings.map((m) => m.sourceField));
  }, [mappings]);

  // When source is selected for a row, auto-suggest the best destination field
  const handleSelectSource = (rowId: string, key: string) => {
    setOpenPopover(null);
    const source = sourceFields.find((f) => f.key === key);

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        let nextDestKey = r.destKey;

        if (source) {
          // Exclude read-only and destinations selected in other draft rows
          const otherSelectedDestKeys = new Set(
            prev
              .filter((other) => other.id !== rowId && other.destKey)
              .map((other) => other.destKey),
          );

          const availableDest = destFields.filter(
            (d) =>
              !readOnlyKeys.has(d.key) && !otherSelectedDestKeys.has(d.key),
          );
          const matches = matchFields([source], availableDest);

          if (matches.length > 0 && matches[0].score >= 40) {
            nextDestKey = matches[0].dest.key;
          } else if (!nextDestKey) {
            // Pick first unmapped destination if no smart match
            const unmapped = availableDest.find(
              (d) => !mappedDestKeys.has(d.key),
            );
            if (unmapped) {
              nextDestKey = unmapped.key;
            }
          }
        }

        return {
          ...r,
          sourceKey: key,
          destKey: nextDestKey,
        };
      }),
    );
  };

  const handleSelectDest = (rowId: string, key: string) => {
    setOpenPopover(null);
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, destKey: key } : r)),
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([createEmptyRow()]);
      onClose();
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Inspect each row for completeness, duplicates, and locked keys
  const getRowStatus = (r: QuickMapDraftRow, index: number) => {
    if (!r.sourceKey && !r.destKey) {
      return { isBlank: true, isValid: false, error: null };
    }

    if (!r.sourceKey || !r.destKey) {
      return {
        isBlank: false,
        isValid: false,
        error: !r.sourceKey
          ? 'Select a source field'
          : 'Select a destination field',
      };
    }

    if (readOnlyKeys.has(r.destKey)) {
      return {
        isBlank: false,
        isValid: false,
        error: 'Destination field is read-only',
      };
    }

    const isCanvasDup = mappings.some(
      (m) =>
        m.sourceField === r.sourceKey &&
        (Array.isArray(m.destField) ? m.destField : [m.destField]).includes(
          r.destKey,
        ),
    );
    if (isCanvasDup) {
      return {
        isBlank: false,
        isValid: false,
        error: 'Pair is already mapped in your canvas',
      };
    }

    const firstDraftIndex = rows.findIndex(
      (o) => o.sourceKey === r.sourceKey && o.destKey === r.destKey,
    );
    if (firstDraftIndex !== index) {
      return {
        isBlank: false,
        isValid: false,
        error: `Duplicate of row #${firstDraftIndex + 1}`,
      };
    }

    return { isBlank: false, isValid: true, error: null };
  };

  // Compute valid pairs that can be committed
  const validPairs = useMemo(() => {
    const pairs: Array<{ source: FieldDef; dest: FieldDef }> = [];
    rows.forEach((r, idx) => {
      const status = getRowStatus(r, idx);
      if (status.isValid) {
        const sf = sourceFields.find((f) => f.key === r.sourceKey);
        const df = destFields.find((f) => f.key === r.destKey);
        if (sf && df) {
          pairs.push({ source: sf, dest: df });
        }
      }
    });
    return pairs;
  }, [rows, sourceFields, destFields, mappings, readOnlyKeys]);

  const hasErrors = rows.some((r, i) => {
    const status = getRowStatus(r, i);
    return !status.isBlank && !status.isValid;
  });

  const canApply = validPairs.length > 0 && !hasErrors;

  const handleApply = () => {
    if (!canApply || validPairs.length === 0) return;

    if (onMapBatch) {
      onMapBatch(validPairs);
    } else if (onMap) {
      validPairs.forEach(({ source, dest }) => onMap(source, dest));
    }

    setRows([createEmptyRow()]);
    onClose();
  };

  const handleDiscard = () => {
    setRows([createEmptyRow()]);
    onClose();
  };

  return (
    <div className="bg-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-top-2 relative border-0 p-4 shadow-xs transition-all">
      {/* Header with Title and Actions (Discard, Apply, Close) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-lg">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-foreground text-xs font-semibold">
            Quick Map Field
          </span>
          <span className="text-muted-foreground text-xs">
            — Select source & target in 1 step
          </span>
        </div>

        {/* Actions where cross icon appears: Discard, Apply, X */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            className="text-muted-foreground hover:text-foreground h-8 cursor-pointer px-2.5 text-xs"
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={handleApply}
            className="h-8 cursor-pointer gap-1.5 px-3 text-xs font-semibold"
          >
            <Check className="size-3.5" />
            <span>
              {validPairs.length > 1 ? `Apply (${validPairs.length})` : 'Apply'}
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer"
            onClick={onClose}
            aria-label="Close Quick Mapper"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Flat Field Rows (No border-b, 100% Column Alignment) */}
      <div className="space-y-2.5">
        {rows.map((row, index) => {
          const status = getRowStatus(row, index);
          const isSourceOpen =
            openPopover?.rowId === row.id && openPopover?.type === 'source';
          const isDestOpen =
            openPopover?.rowId === row.id && openPopover?.type === 'dest';

          const selectedSourceField = sourceFields.find(
            (f) => f.key === row.sourceKey,
          );
          const selectedDestField = destFields.find(
            (f) => f.key === row.destKey,
          );

          return (
            <div key={row.id}>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                {/* Source Field Selector */}
                <div className="min-w-0 flex-1">
                  <Popover
                    open={isSourceOpen}
                    onOpenChange={(open) =>
                      setOpenPopover(
                        open ? { rowId: row.id, type: 'source' } : null,
                      )
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-label={
                          selectedSourceField?.label ||
                          selectedSourceField?.key ||
                          'Choose source field'
                        }
                        aria-expanded={isSourceOpen}
                        className={cn(
                          'bg-background h-9 w-full justify-between px-3 text-xs font-normal',
                          !selectedSourceField && 'text-muted-foreground',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-muted-foreground text-[10px] font-medium uppercase">
                            {sourcePlatformLabel}:
                          </span>
                          <span className="text-foreground truncate font-medium">
                            {selectedSourceField?.label ||
                              selectedSourceField?.key ||
                              'Choose source field…'}
                          </span>
                          {selectedSourceField?.type && (
                            <Badge
                              variant="secondary"
                              size="xs"
                              className="font-mono text-[9px] capitalize"
                            >
                              {selectedSourceField.type}
                            </Badge>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search source fields…" />
                        <CommandList className="max-h-64">
                          <CommandEmpty>No field found.</CommandEmpty>
                          <CommandGroup heading="Available Fields">
                            {sourceFields.map((f) => {
                              const isMapped = mappedSourceKeys.has(f.key);
                              return (
                                <CommandItem
                                  key={f.key}
                                  value={`${f.label || ''} ${f.key}`}
                                  onSelect={() =>
                                    handleSelectSource(row.id, f.key)
                                  }
                                  className="flex cursor-pointer items-center justify-between py-2 text-xs"
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                      {f.label || f.key}
                                    </span>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                      {f.key}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {f.type && (
                                      <Badge
                                        variant="secondary"
                                        size="xs"
                                        className="text-[10px] capitalize"
                                      >
                                        {f.type}
                                      </Badge>
                                    )}
                                    {isMapped && (
                                      <Badge
                                        variant="secondary"
                                        size="xs"
                                        className="bg-primary/10 text-primary text-[10px]"
                                      >
                                        Mapped
                                      </Badge>
                                    )}
                                    {row.sourceKey === f.key && (
                                      <Check className="text-primary size-3.5" />
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Direction Flow Arrow */}
                <div className="flex shrink-0 items-center justify-center">
                  <ArrowRight className="text-muted-foreground size-4" />
                </div>

                {/* Destination Field Selector */}
                <div className="min-w-0 flex-1">
                  <Popover
                    open={isDestOpen}
                    onOpenChange={(open) =>
                      setOpenPopover(
                        open ? { rowId: row.id, type: 'dest' } : null,
                      )
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-label={
                          selectedDestField?.label ||
                          selectedDestField?.key ||
                          'Choose destination field'
                        }
                        aria-expanded={isDestOpen}
                        className={cn(
                          'bg-background h-9 w-full justify-between px-3 text-xs font-normal',
                          !selectedDestField && 'text-muted-foreground',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-muted-foreground text-[10px] font-medium uppercase">
                            {destPlatformLabel}:
                          </span>
                          <span className="text-foreground truncate font-medium">
                            {selectedDestField?.label ||
                              selectedDestField?.key ||
                              'Choose destination field…'}
                          </span>
                          {selectedDestField?.required && (
                            <span className="text-destructive font-bold">
                              *
                            </span>
                          )}
                          {selectedDestField?.type && (
                            <Badge
                              variant="secondary"
                              size="xs"
                              className="font-mono text-[9px] capitalize"
                            >
                              {selectedDestField.type}
                            </Badge>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search destination fields…" />
                        <CommandList className="max-h-64">
                          <CommandEmpty>No field found.</CommandEmpty>
                          <CommandGroup heading="Available Fields">
                            {destFields.map((f) => {
                              const isMapped = mappedDestKeys.has(f.key);
                              const isLocked = readOnlyKeys.has(f.key);
                              const isSelectedInOtherRow = rows.some(
                                (other) =>
                                  other.id !== row.id &&
                                  other.destKey === f.key,
                              );

                              return (
                                <CommandItem
                                  key={f.key}
                                  value={`${f.label || ''} ${f.key}`}
                                  disabled={isLocked}
                                  onSelect={() =>
                                    handleSelectDest(row.id, f.key)
                                  }
                                  className="flex cursor-pointer items-center justify-between py-2 text-xs"
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="truncate font-medium">
                                        {f.label || f.key}
                                      </span>
                                      {f.required && (
                                        <span className="text-destructive font-bold">
                                          *
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                      {f.key}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {isLocked ? (
                                      <Badge
                                        variant="outline"
                                        size="xs"
                                        className="text-muted-foreground text-[10px]"
                                      >
                                        <Lock className="mr-0.5 size-2.5" />{' '}
                                        Read-only
                                      </Badge>
                                    ) : f.required ? (
                                      <Badge
                                        variant="secondary"
                                        size="xs"
                                        className="bg-destructive/10 text-destructive text-[10px]"
                                      >
                                        Required
                                      </Badge>
                                    ) : isSelectedInOtherRow ? (
                                      <Badge
                                        variant="outline"
                                        size="xs"
                                        className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
                                      >
                                        In Draft
                                      </Badge>
                                    ) : isMapped ? (
                                      <Badge
                                        variant="secondary"
                                        size="xs"
                                        className="bg-primary/10 text-primary text-[10px]"
                                      >
                                        Mapped
                                      </Badge>
                                    ) : null}
                                    {row.destKey === f.key && (
                                      <Check className="text-primary size-3.5" />
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Fixed-Width Action Column (w-8 h-9): Guarantees 100% Column Alignment across all rows */}
                <div className="flex h-9 w-8 shrink-0 items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleRemoveRow(row.id)}
                    className="border-destructive/40 bg-background text-destructive hover:border-destructive hover:bg-destructive/10 size-7 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
                    title={
                      rows.length > 1
                        ? `Delete row ${index + 1}`
                        : 'Delete row and close'
                    }
                    aria-label={
                      rows.length > 1
                        ? `Delete row ${index + 1}`
                        : 'Delete row and close'
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Inline Row Validation Error */}
              {status.error && (
                <div className="text-destructive mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{status.error}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Option B: Right-Edge Floating Plus Button (Excel Sheet Corner Style) */}
        <div className="flex justify-end pt-0.5">
          <div className="flex w-8 shrink-0 items-center justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={handleAddRow}
              title="Add mapping row"
              aria-label="Add mapping row"
              className="border-primary/40 bg-background text-primary hover:border-primary hover:bg-primary/10 size-7 cursor-pointer rounded-lg border-dashed shadow-xs transition-all"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
