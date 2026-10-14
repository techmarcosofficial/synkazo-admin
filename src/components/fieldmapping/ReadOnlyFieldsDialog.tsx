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
      <DialogContent
        size="lg"
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-border bg-muted/30 border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="bg-muted text-muted-foreground border-border flex size-7 items-center justify-center rounded-lg border">
                <Lock className="size-3.5" />
              </div>
              <DialogTitle className="text-foreground text-base font-semibold tracking-tight">
                Read-Only {platformLabel} Fields
              </DialogTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
              These properties are managed automatically by {platformLabel}{' '}
              (such as system IDs, creation dates, or calculated formulas) and
              cannot receive incoming mapped values.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="border-border bg-card border-b px-6 py-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search read-only fields by name, key, or type…"
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] flex-1">
          {filteredFields.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center text-xs">
              <Lock className="mb-2 size-8 opacity-40" />
              {search
                ? 'No matching read-only fields found.'
                : 'No read-only fields.'}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 dark:bg-muted/30 border-border sticky top-0 z-10 border-b">
                <TableRow className="border-border border-b hover:bg-transparent">
                  <TableHead className="text-foreground/80 dark:text-foreground/75 w-[45%] py-2.5 pl-6 text-xs font-semibold">
                    Field Label
                  </TableHead>
                  <TableHead className="text-foreground/80 dark:text-foreground/75 w-[35%] px-4 py-2.5 text-xs font-semibold">
                    Property Key
                  </TableHead>
                  <TableHead className="text-foreground/80 dark:text-foreground/75 w-[20%] py-2.5 pr-6 text-right text-xs font-semibold">
                    Type
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map((f) => (
                  <TableRow
                    key={f.key}
                    className="border-border/70 border-b"
                  >
                    <TableCell className="text-foreground py-2.5 pl-6 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Lock className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate">{f.label || f.key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                      {f.key}
                    </TableCell>
                    <TableCell className="py-2.5 pr-6 text-right">
                      <Badge
                        variant="secondary"
                        className="font-mono text-[11px] capitalize"
                      >
                        {f.type || 'string'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter className="border-border bg-muted/20 border-t px-6 py-3">
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
