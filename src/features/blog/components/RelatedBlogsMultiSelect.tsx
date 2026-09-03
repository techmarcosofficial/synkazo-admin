import { ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useBlogsQuery } from '@/queries/useBlog';

export function RelatedBlogsMultiSelect({
  currentBlogId,
  value,
  onChange,
}: {
  currentBlogId: string | undefined;
  value: string[];
  onChange: (blogIds: string[]) => void;
}) {
  // A company blog runs to dozens, not thousands, of posts — a single page
  // fetched client-side and filtered locally is simpler than a server-side
  // search endpoint here (unlike BlogEditor's internal-link picker, which
  // does use one, since that flow needs to work well past this scale too).
  const blogsQuery = useBlogsQuery({ limit: 100 });
  const candidates = (blogsQuery.data?.items ?? []).filter((b) => b.id !== currentBlogId);
  const [open, setOpen] = useState(false);

  const selected = candidates.filter((b) => value.includes(b.id));

  const toggle = (blogId: string) => {
    onChange(value.includes(blogId) ? value.filter((id) => id !== blogId) : [...value, blogId]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            loading={blogsQuery.isLoading}
          >
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {selected.length > 0
                ? `${selected.length} related post${selected.length > 1 ? 's' : ''}`
                : 'Select related posts…'}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput placeholder="Search posts…" />
            <CommandList>
              <CommandEmpty>No posts found.</CommandEmpty>
              <CommandGroup>
                {candidates.map((blog) => (
                  <CommandItem
                    key={blog.id}
                    value={blog.title}
                    data-checked={value.includes(blog.id)}
                    onSelect={() => toggle(blog.id)}
                  >
                    {blog.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((blog) => (
            <Badge key={blog.id} variant="secondary">
              {blog.title}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== blog.id))}
                className="hover:bg-muted-foreground/20 ml-0.5 rounded-full"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
