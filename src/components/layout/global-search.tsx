import { ArrowRight, FolderOpen, GitMerge, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { jobsApi } from '@/api/jobs';
import { projectsApi } from '@/api/projects';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Job, Project } from '@/types';

interface SearchData {
  projects: Project[];
  jobs: Job[];
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchData | null>(null);

  const loadAll = useCallback(async () => {
    if (data) return;
    try {
      const [projects, jobs] = await Promise.all([
        projectsApi.listProjects(),
        jobsApi.listAllJobs(),
      ]);
      setData({ projects: projects ?? [], jobs: jobs ?? [] });
    } catch {
      /* non-fatal */
    }
  }, [data]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) loadAll();
  }, [open, loadAll]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 w-full max-w-xl"
      >
        <Search className="mr-2 h-4 w-4 shrink-0" />

        <span className="flex-1 text-left text-sm">
          Search projects, jobs, connections...
        </span>

        <kbd className="bg-muted py-0.8 text-muted-foreground hidden items-center rounded-md border px-2 text-[11px] font-medium sm:flex">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search projects, jobs, connections..."
          className="h-12"
        />

        <CommandList className="max-h-[420px]">
          <CommandEmpty className="text-muted-foreground py-8 text-center text-sm">
            No results found.
          </CommandEmpty>

          {data && data.projects.length > 0 && (
            <CommandGroup heading="Projects">
              {data.projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  onSelect={() => go(`/projects/${p.id}`)}
                  className="gap-3 py-3"
                >
                  <FolderOpen className="text-primary h-4 w-4" />

                  <div className="flex flex-1 flex-col">
                    <span>{p.name}</span>

                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      {p.sourcePlatformId} <ArrowRight className="size-3" />{' '}
                      {p.destPlatformId}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data && data.jobs.length > 0 && (
            <CommandGroup heading="All Jobs">
              {data.jobs.map((j) => (
                <CommandItem
                  key={j.id}
                  value={`job ${j.name}`}
                  onSelect={() => go(`/projects/${j.projectId}/jobs/${j.id}`)}
                  className="gap-3 py-3"
                >
                  <GitMerge className="text-primary h-4 w-4" />

                  <div className="flex flex-1 flex-col">
                    <span>{j.name}</span>

                    <span className="text-muted-foreground text-xs">
                      {j.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
