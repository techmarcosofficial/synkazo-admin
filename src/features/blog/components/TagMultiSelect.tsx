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
import { useTagsQuery } from '@/queries/useBlog';
import { cn } from '@/lib/utils';

export function TagMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const tagsQuery = useTagsQuery();
  const tags = tagsQuery.data ?? [];
  const [open, setOpen] = useState(false);

  const selected = tags.filter((t) => value.includes(t.id));

  const toggle = (tagId: string) => {
    onChange(value.includes(tagId) ? value.filter((id) => id !== tagId) : [...value, tagId]);
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
            loading={tagsQuery.isLoading}
          >
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {selected.length > 0 ? `${selected.length} tag${selected.length > 1 ? 's' : ''}` : 'Select tags…'}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput placeholder="Search tags…" />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    data-checked={value.includes(tag.id)}
                    onSelect={() => toggle(tag.id)}
                  >
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== tag.id))}
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
