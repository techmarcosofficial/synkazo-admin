import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  Lock,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  onMap: (source: FieldDef, dest: FieldDef) => void;
  onClose: () => void;
  sourcePlatformLabel: string;
  destPlatformLabel: string;
  readOnlyKeys?: Set<string>;
}

export default function QuickFieldMapper({
  sourceFields,
  destFields,
  mappings,
  onMap,
  onClose,
  sourcePlatformLabel,
  destPlatformLabel,
  readOnlyKeys = new Set(),
}: QuickFieldMapperProps) {
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('');
  const [selectedDestKey, setSelectedDestKey] = useState<string>('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);

  // Set of already mapped destination keys
  const mappedDestKeys = useMemo(() => {
    const set = new Set<string>();
    mappings.forEach((m) => {
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      dests.forEach((d) => set.add(d));
    });
    return set;
  }, [mappings]);

  // Set of already mapped source keys
  const mappedSourceKeys = useMemo(() => {
    return new Set(mappings.map((m) => m.sourceField));
  }, [mappings]);

  const selectedSourceField = useMemo(
    () => sourceFields.find((f) => f.key === selectedSourceKey),
    [sourceFields, selectedSourceKey],
  );

  const selectedDestField = useMemo(
    () => destFields.find((f) => f.key === selectedDestKey),
    [destFields, selectedDestKey],
  );

  // When source is selected, auto-suggest the best destination field
  const handleSelectSource = (key: string) => {
    setSelectedSourceKey(key);
    setSourceOpen(false);

    const source = sourceFields.find((f) => f.key === key);
    if (!source) return;

    // Filter available destination fields (exclude already mapped dest keys if possible)
    const availableDest = destFields.filter((d) => !readOnlyKeys.has(d.key));
    const matches = matchFields([source], availableDest);

    if (matches.length > 0 && matches[0].score >= 40) {
      setSelectedDestKey(matches[0].dest.key);
    } else if (!selectedDestKey) {
      // Pick first unmapped destination if no smart match
      const unmapped = availableDest.find((d) => !mappedDestKeys.has(d.key));
      if (unmapped) {
        setSelectedDestKey(unmapped.key);
      }
    }
  };

  const handleSelectDest = (key: string) => {
    setSelectedDestKey(key);
    setDestOpen(false);
  };

  const handleApply = () => {
    if (!selectedSourceField || !selectedDestField) return;
    onMap(selectedSourceField, selectedDestField);
    // Reset or keep source for fan-out
    setSelectedSourceKey('');
    setSelectedDestKey('');
  };

  const isDuplicate = useMemo(() => {
    if (!selectedSourceKey || !selectedDestKey) return false;
    return mappings.some((m) => {
      if (m.sourceField !== selectedSourceKey) return false;
      const dests = Array.isArray(m.destField) ? m.destField : [m.destField];
      return dests.includes(selectedDestKey);
    });
  }, [mappings, selectedSourceKey, selectedDestKey]);

  const canMap =
    Boolean(selectedSourceField) &&
    Boolean(selectedDestField) &&
    !isDuplicate &&
    !readOnlyKeys.has(selectedDestKey);

  return (
    <div className="bg-primary/5 border-primary/20 relative animate-in fade-in-0 slide-in-from-top-2 border-0 p-4 shadow-xs transition-all">
      <div className="flex items-center justify-between pb-3">
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
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close Quick Mapper"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Source Field Selector */}
        <div className="min-w-0 flex-1">
          <Popover open={sourceOpen} onOpenChange={setSourceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={sourceOpen}
                className={cn(
                  'h-10 w-full justify-between bg-background px-3 text-xs font-normal',
                  !selectedSourceField && 'text-muted-foreground',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase">
                    {sourcePlatformLabel}:
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {selectedSourceField?.label ||
                      selectedSourceField?.key ||
                      'Choose source field…'}
                  </span>
                  {selectedSourceField?.type && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="text-[10px] font-mono capitalize"
                    >
                      {selectedSourceField.type}
                    </Badge>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
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
                          onSelect={() => handleSelectSource(f.key)}
                          className="flex items-center justify-between py-2 text-xs"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {f.label || f.key}
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {f.key}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
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
                            {selectedSourceKey === f.key && (
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
        <div className="flex items-center justify-center shrink-0">
          <ArrowRight className="text-muted-foreground size-4" />
        </div>

        {/* Destination Field Selector */}
        <div className="min-w-0 flex-1">
          <Popover open={destOpen} onOpenChange={setDestOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={destOpen}
                className={cn(
                  'h-10 w-full justify-between bg-background px-3 text-xs font-normal',
                  !selectedDestField && 'text-muted-foreground',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase">
                    {destPlatformLabel}:
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {selectedDestField?.label ||
                      selectedDestField?.key ||
                      'Choose destination field…'}
                  </span>
                  {selectedDestField?.required && (
                    <span className="text-destructive font-bold">*</span>
                  )}
                  {selectedDestField?.type && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="text-[10px] font-mono capitalize"
                    >
                      {selectedDestField.type}
                    </Badge>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search destination fields…" />
                <CommandList className="max-h-64">
                  <CommandEmpty>No field found.</CommandEmpty>
                  <CommandGroup heading="Available Fields">
                    {destFields.map((f) => {
                      const isMapped = mappedDestKeys.has(f.key);
                      const isLocked = readOnlyKeys.has(f.key);
                      return (
                        <CommandItem
                          key={f.key}
                          value={`${f.label || ''} ${f.key}`}
                          disabled={isLocked}
                          onSelect={() => handleSelectDest(f.key)}
                          className="flex items-center justify-between py-2 text-xs"
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
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isLocked ? (
                              <Badge
                                variant="outline"
                                size="xs"
                                className="text-muted-foreground text-[10px]"
                              >
                                <Lock className="mr-0.5 size-2.5" /> Read-only
                              </Badge>
                            ) : f.required ? (
                              <Badge
                                variant="secondary"
                                size="xs"
                                className="bg-destructive/10 text-destructive text-[10px]"
                              >
                                Required
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
                            {selectedDestKey === f.key && (
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

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="default"
            disabled={!canMap}
            onClick={handleApply}
            className="h-10 px-4 text-xs font-semibold"
          >
            <Plus className="mr-1 size-4" /> Map Field
          </Button>
        </div>
      </div>

      {isDuplicate && (
        <p className="text-destructive mt-2 text-[11px]">
          This source and destination pair is already mapped.
        </p>
      )}
    </div>
  );
}
