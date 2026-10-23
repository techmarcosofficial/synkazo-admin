import { formatDistanceToNow } from 'date-fns';
import { StickyNote, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import {
  useCreateSuperAdminNoteMutation,
  useDeleteSuperAdminNoteMutation,
  useSuperAdminNotesQuery,
} from '@/queries/useSuperAdmin';
import type { OrganisationNoteCategory } from '@/types';

interface Props {
  organisationId: string;
  category: Extract<OrganisationNoteCategory, 'billing' | 'support'>;
}

function errorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? 'The request failed. Try again.'
  );
}

/** Shared scoped notes UI; billing and support keep their own category. */
export default function OrganisationNotesCard({
  organisationId,
  category,
}: Props) {
  const notesQuery = useSuperAdminNotesQuery(organisationId, category);
  const createMutation = useCreateSuperAdminNoteMutation(organisationId);
  const deleteMutation = useDeleteSuperAdminNoteMutation(organisationId);
  const { confirm } = useConfirmDialog();
  const [body, setBody] = useState('');
  const title = category === 'billing' ? 'Billing notes' : 'Support notes';

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await createMutation.mutateAsync({
        dto: { category, body: trimmed },
        idempotencyKey: createIdempotencyKey(),
      });
      setBody('');
      showToast.success('Note added.');
    } catch (err) {
      showToast.error(errorMessage(err));
    }
  };

  const confirmDelete = (noteId: string) => {
    confirm({
      variant: 'danger',
      title: 'Delete note?',
      description: 'This note will be removed from the organisation history.',
      confirmLabel: 'Delete note',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(noteId);
          showToast.success('Note deleted.');
        } catch (err) {
          showToast.error(errorMessage(err));
          throw err;
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader visualLevel="section">
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="text-muted-foreground size-4" aria-hidden />
          {title}
          <Badge variant="secondary">{notesQuery.data?.length ?? 0}</Badge>
        </CardTitle>
        <CardDescription>
          Shared with platform administrators working on this organisation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <Textarea
            aria-label={`New ${category} note`}
            placeholder={
              category === 'billing'
                ? 'Add context for the next operator handling this billing case.'
                : 'Record the outcome of a call, chat, or support request.'
            }
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={submit}
              disabled={!body.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Add note'}
            </Button>
          </div>
        </div>

        {notesQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading notes…</p>
        ) : notesQuery.isError ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-destructive text-sm">
              {errorMessage(notesQuery.error)}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => notesQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : notesQuery.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No {category} notes yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notesQuery.data?.map((note) => (
              <li key={note.id} className="bg-muted/30 rounded-3xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {note.createdByEmail ?? 'System'}
                    </p>
                    <p
                      className="text-muted-foreground text-xs"
                      title={note.createdAt}
                    >
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Delete note by ${note.createdByEmail ?? 'System'}`}
                    onClick={() => confirmDelete(note.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <p className="mt-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
