import type { Editor } from '@tiptap/react';
import { Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLinkSuggestionsQuery } from '@/queries/useBlog';

// Deterministic, rule-based suggestions from BlogService.getLinkSuggestions
// (title/keyword matching against this post's plain text) — surfaced for the
// admin to review and insert manually. Never auto-applied to content; only
// available once the post has been saved once (needs a blogId to match against).
export function SuggestedLinksPanel({
  blogId,
  editor,
}: {
  blogId: string | undefined;
  editor: Editor | null;
}) {
  const suggestionsQuery = useLinkSuggestionsQuery(blogId);
  const suggestions = suggestionsQuery.data ?? [];

  if (!blogId) {
    return (
      <Card className="text-muted-foreground p-4 text-sm">
        Save this post once to see internal-link suggestions.
      </Card>
    );
  }

  if (suggestionsQuery.isLoading) {
    return <Card className="text-muted-foreground p-4 text-sm">Checking for related posts…</Card>;
  }

  if (suggestions.length === 0) {
    return (
      <Card className="text-muted-foreground p-4 text-sm">
        No internal-link suggestions right now.
      </Card>
    );
  }

  const insert = (title: string, id: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus('end')
      .insertContent(' ')
      .setInternalLink(id)
      .insertContent(title)
      .unsetInternalLink()
      .run();
  };

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4" />
        <span className="text-sm font-semibold">Suggested internal links</span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        Rule-based, not AI — matched by title/keyword. Review before inserting.
      </p>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{s.title}</span>
            <Button variant="outline" size="xs" onClick={() => insert(s.title, s.id)}>
              Insert
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
