import { Lock, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ReadOnlyFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FieldDef[];
  platformLabel?: string;
}

export default function ReadOnlyFieldsDialog({
  open,
  onOpenChange,
  fields,
  platformLabel = 'Destination',
}: ReadOnlyFieldsDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="flex max-h-[85vh] flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                <Lock className="size-3.5" />
              </div>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Read-Only {platformLabel} Fields
              </DialogTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              These properties are managed automatically by {platformLabel} (such as system IDs, creation dates, or calculated formulas) and cannot receive incoming mapped values.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="border-b border-border bg-card px-6 py-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search read-only fields by name, key, or type…"
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          {filteredFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs">
              <Lock className="size-8 opacity-40 mb-2" />
              {search ? 'No matching read-only fields found.' : 'No read-only fields.'}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 dark:bg-muted/30 border-b border-border sticky top-0 z-10">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-[45%] py-2.5 pl-6 font-semibold uppercase tracking-wider text-xs text-foreground/80 dark:text-foreground/75">
                    Field Label
                  </TableHead>
                  <TableHead className="w-[35%] py-2.5 px-4 font-semibold uppercase tracking-wider text-xs text-foreground/80 dark:text-foreground/75">
                    Property Key
                  </TableHead>
                  <TableHead className="w-[20%] text-right py-2.5 pr-6 font-semibold uppercase tracking-wider text-xs text-foreground/80 dark:text-foreground/75">
                    Type
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map((f) => (
                  <TableRow key={f.key} className="border-b border-border/70 hover:bg-muted/30">
                    <TableCell className="py-2.5 pl-6 font-medium text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Lock className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{f.label || f.key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {f.key}
                    </TableCell>
                    <TableCell className="text-right py-2.5 pr-6">
                      <Badge variant="secondary" className="text-[11px] font-mono capitalize">
                        {f.type || 'string'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
