import { formatDistanceToNow } from 'date-fns';
import { NotebookPen, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { createIdempotencyKey } from '@/lib/idempotency';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useCreateSuperAdminNoteMutation,
  useDeleteSuperAdminNoteMutation,
  useSuperAdminNotesQuery,
} from '@/queries/useSuperAdmin';

interface BillingNotesCardProps {
  organisationId: string;
  className?: string;
}

const QUICK_TAGS = [
  'Payment Follow-up',
  'Plan Inquiry',
  'Manual Hold',
  'Invoice Dispute',
];

function errorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? 'The request failed. Try again.'
  );
}

export default function BillingNotesCard({
  organisationId,
  className,
}: BillingNotesCardProps) {
  const notesQuery = useSuperAdminNotesQuery(organisationId, 'billing');
  const createMutation = useCreateSuperAdminNoteMutation(organisationId);
  const deleteMutation = useDeleteSuperAdminNoteMutation(organisationId);
  const { confirm } = useConfirmDialog();
  const [body, setBody] = useState('');

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await createMutation.mutateAsync({
        dto: { category: 'billing', body: trimmed },
        idempotencyKey: createIdempotencyKey(),
      });
      setBody('');
      showToast.success('Billing note added.');
    } catch (err) {
      showToast.error(errorMessage(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const insertTag = (tag: string) => {
    const prefix = `[${tag}]: `;
    if (!body.includes(prefix)) {
      setBody((prev) => (prev ? `${prefix}${prev}` : prefix));
    }
  };

  const confirmDelete = (noteId: string) => {
    confirm({
      variant: 'danger',
      title: 'Delete billing note?',
      description:
        'This note will be permanently removed from the billing case history.',
      confirmLabel: 'Delete note',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(noteId);
          showToast.success('Billing note deleted.');
        } catch (err) {
          showToast.error(errorMessage(err));
          throw err;
        }
      },
    });
  };

  const notes = notesQuery.data ?? [];

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <CardHeader className="p-0 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <NotebookPen
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>Billing Notes</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-semibold"
            >
              {notes.length}
            </Badge>
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Internal notes and context for support & billing audit continuity.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-3">
        {/* Quick tag chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">
            Quick tag:
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              +{tag}
            </button>
          ))}
        </div>

        {/* Note Composer */}
        <div className="space-y-2">
          <Textarea
            aria-label="New billing note"
            placeholder="Add internal context, billing case update, or resolution note... (Ctrl+Enter to save)"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xs resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Press{' '}
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">
                Ctrl+Enter
              </kbd>{' '}
              to save
            </span>
            <Button
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={submit}
              disabled={!body.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes List / Timeline */}
        <div className="pt-2 border-t space-y-2.5">
          {notesQuery.isLoading ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Loading notes…
            </p>
          ) : notesQuery.isError ? (
            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-destructive">
                {errorMessage(notesQuery.error)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => notesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : notes.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-3">
              No internal billing notes yet. Add one above to record support or
              case context.
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border bg-muted/30 p-3 space-y-1.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                      {note.createdByEmail ?? 'Super Admin'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[10px] text-muted-foreground"
                        title={new Date(note.createdAt).toLocaleString()}
                      >
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete note by ${note.createdByEmail ?? 'Super Admin'}`}
                        onClick={() => confirmDelete(note.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
