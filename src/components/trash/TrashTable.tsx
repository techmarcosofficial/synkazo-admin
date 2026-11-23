import { Loader2, RotateCcw, Trash2 } from 'lucide-react';

import type { TrashItem } from '@/api/trashTypes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TrashTableProps {
  items: TrashItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRestore: (item: TrashItem) => void;
  onPermanentDelete?: (item: TrashItem) => void;
  busyId?: string | null;
}

const TYPE_LABEL: Record<TrashItem['type'], string> = {
  organisation: 'Organisation',
  project: 'Project',
  job: 'Job',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function parentLabel(item: TrashItem): string {
  if (item.type === 'organisation') return '—';
  if (item.type === 'job') {
    return [item.organisationName, item.projectName]
      .filter(Boolean)
      .join(' / ');
  }
  return item.organisationName ?? '—';
}

export function TrashTable({
  items,
  isLoading,
  isError,
  onRetry,
  onRestore,
  onPermanentDelete,
  busyId,
}: TrashTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="ml-2">Loading trash…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn’t load trash</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>Something went wrong fetching deleted items.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Trash is empty</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Belongs to</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <TableRow key={`${item.type}:${item.id}`}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.deletionReason ? (
                    <span className="block text-xs text-muted-foreground">
                      {item.deletionReason}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABEL[item.type]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {parentLabel(item)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(item.deletedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRestore(item)}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      Restore
                    </Button>
                    {onPermanentDelete ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => onPermanentDelete(item)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
