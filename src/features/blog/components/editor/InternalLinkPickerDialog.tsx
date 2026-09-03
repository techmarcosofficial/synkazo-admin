import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBlogSearchQuery } from '@/queries/useBlog';

export function InternalLinkPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (blogId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const searchQuery = useBlogSearchQuery(query);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to another post</DialogTitle>
          <DialogDescription>
            Links by post id, not URL — renaming the target's slug later won't
            break this link.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts by title…"
            className="pl-9"
          />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {searchQuery.isFetching && (
            <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          )}
          {!searchQuery.isFetching && query.trim().length >= 2 && searchQuery.data?.length === 0 && (
            <p className="text-muted-foreground p-3 text-sm">No posts match "{query}".</p>
          )}
          {(searchQuery.data ?? []).map((result) => (
            <button
              key={result.id}
              type="button"
              className="hover:bg-accent w-full rounded-lg border p-3 text-left"
              onClick={() => {
                onSelect(result.id);
                onOpenChange(false);
                setQuery('');
              }}
            >
              <div className="text-sm font-medium">{result.title}</div>
              <div className="text-muted-foreground text-xs">/blog/{result.slug}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
