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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { cn } from '@/lib/utils';
import { useProjectsQuery } from '@/queries/useProjects';

interface ProjectMultiSelectProps {
  value: string[];
  onChange: (projectIds: string[]) => void;
}

export default function ProjectMultiSelect({
  value,
  onChange,
}: ProjectMultiSelectProps) {
  const { currentUser } = useSBAuth();
  const projectsQuery = useProjectsQuery();
  // GET /projects returns every org's projects for a super_admin (needed by the platform-wide
  // admin pages) — grants here must stay within the inviting admin's own organisation, which is
  // also what the backend enforces when creating the invitation (see InvitationsService.create).
  const projects = (projectsQuery.data ?? []).filter(
    (p) => p.organisationId === currentUser?.organisationId,
  );
  const [open, setOpen] = useState(false);

  const selected = projects.filter((p) => value.includes(p.id));

  const toggle = (projectId: string) => {
    onChange(
      value.includes(projectId)
        ? value.filter((id) => id !== projectId)
        : [...value, projectId],
    );
  };

  const remove = (projectId: string) =>
    onChange(value.filter((id) => id !== projectId));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            loading={projectsQuery.isLoading}
          >
            <span
              className={cn(
                'truncate',
                selected.length === 0 && 'text-muted-foreground',
              )}
            >
              {selected.length > 0
                ? `${selected.length} project${selected.length > 1 ? 's' : ''} selected`
                : 'Select projects…'}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput placeholder="Search projects…" />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    data-checked={value.includes(project.id)}
                    onSelect={() => toggle(project.id)}
                  >
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((project) => (
            <Badge key={project.id} variant="secondary">
              {project.name}
              <button
                type="button"
                onClick={() => remove(project.id)}
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
