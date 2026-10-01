import { formatDistanceToNow } from 'date-fns';
import { StickyNote, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { createIdempotencyKey } from '@/lib/idempotency';
import { showToast } from '@/lib/toast';
import {
  useCreateSuperAdminNoteMutation,
  useDeleteSuperAdminNoteMutation,
  useSuperAdminNotesQuery,
} from '@/queries/useSuperAdmin';

interface Props {
  organisationId: string;
}

// CAP-029 / CAP-093..097 — operator notes against an organisation. The
// billing surface filters to category='billing' so notes stay scoped to
// the context the operator is in.

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function BillingNotesCard({ organisationId }: Props) {
  const notesQuery = useSuperAdminNotesQuery(organisationId, 'billing');
  const createMutation = useCreateSuperAdminNoteMutation(organisationId);
  const deleteMutation = useDeleteSuperAdminNoteMutation(organisationId);
  const [body, setBody] = useState('');

  const submit = () => {
    if (!body.trim()) return;
    createMutation.mutate(
      {
        dto: { category: 'billing', body: body.trim() },
        idempotencyKey: createIdempotencyKey(),
      },
      {
        onSuccess: () => {
          showToast.success('Note added.');
          setBody('');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="size-4" aria-hidden />
          Billing notes
          <Badge variant="outline">{notesQuery.data?.length ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add context the next operator will see on this org's billing case."
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {createMutation.isError
                ? extractErrorMessage(createMutation.error)
                : 'Visible to every super admin viewing this org.'}
            </span>
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
          <div className="text-muted-foreground text-sm">Loading notes…</div>
        ) : notesQuery.isError ? (
          <div className="text-destructive text-sm">
            {extractErrorMessage(notesQuery.error)}
          </div>
        ) : (notesQuery.data?.length ?? 0) === 0 ? (
          <div className="text-muted-foreground text-sm">
            No billing notes yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {notesQuery.data!.map((note) => (
              <li
                key={note.id}
                className="border-border bg-muted/30 flex flex-col gap-1 rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium">
                      {note.createdByEmail ?? 'unknown'}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-7 px-1"
                    onClick={() => deleteMutation.mutate(note.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
                <div className="text-sm whitespace-pre-wrap">{note.body}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
