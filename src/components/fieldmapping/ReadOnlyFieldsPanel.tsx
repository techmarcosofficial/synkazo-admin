import { ChevronUp, Lock, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ReadOnlyFieldsPanelProps {
  fields: FieldDef[];
  platformLabel?: string;
  onClose: () => void;
  className?: string;
}

export default function ReadOnlyFieldsPanel({
  fields,
  platformLabel = 'HubSpot',
  onClose,
  className,
}: ReadOnlyFieldsPanelProps) {
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (f) =>
        f.label?.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.type?.toLowerCase().includes(q),
    );
  }, [fields, search]);

  return (
    <div
      data-testid="read-only-fields-panel"
      className={cn(
        'bg-muted/40 dark:bg-muted/20 border border-border/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 text-xs transition-all shadow-none',
        className,
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl mt-0.5 sm:mt-0">
            <Lock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground text-xs">
                Unmapped {platformLabel} Fields
              </span>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium rounded-lg px-2 py-0.5"
              >
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 leading-normal">
              These destination properties are read-only, system-managed, or calculated in {platformLabel} and cannot receive mapped data.
            </p>
          </div>
        </div>

        {/* Search & Collapse Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <div className="relative w-48 sm:w-56">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${fields.length} fields…`}
              className="pl-8 pr-7 h-7.5 text-xs bg-background border-border rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-0.5 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onClose}
            aria-label="Hide unmapped fields panel"
            className="h-7.5 gap-1 text-xs text-muted-foreground hover:text-foreground rounded-xl shrink-0 cursor-pointer"
          >
            <span>Hide</span>
            <ChevronUp className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 2-Column Scrollable Grid Area with reduced gap and soft rounded cards */}
      <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center text-muted-foreground text-xs">
            <Lock className="size-5 opacity-40 mb-1.5" />
            <span>No unmapped fields matching &ldquo;{search}&rdquo;</span>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-1 text-primary text-[11px] hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {filteredFields.map((f) => (
              <div
                key={f.key}
                data-testid={`read-only-field-${f.key}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/80 hover:bg-background px-2.5 py-1.5 transition-colors hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="size-5 rounded-lg flex items-center justify-center bg-muted/60 text-muted-foreground shrink-0 border border-border/50">
                    <Lock className="size-2.5" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <span
                      className="text-xs font-medium text-foreground truncate leading-tight"
                      title={f.label || f.key}
                    >
                      {f.label || f.key}
                    </span>
                    <span
                      className="font-mono text-[10px] text-muted-foreground truncate leading-tight"
                      title={f.key}
                    >
                      {f.key}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono capitalize shrink-0 border-0 bg-muted/80 text-muted-foreground px-1.5 py-0 rounded-md"
                >
                  {f.type || 'string'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary Bar */}
      <div className="border-t border-border/60 pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Showing {filteredFields.length} of {fields.length} unmapped properties
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
        >
          Hide unmapped fields
        </button>
      </div>
    </div>
  );
}
