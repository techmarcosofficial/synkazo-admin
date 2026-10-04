import {
  ArrowRight,
  Building2,
  ClipboardList,
  CreditCard,
  FolderOpen,
  GitMerge,
  LayoutDashboard,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { jobsApi } from '@/api/jobs';
import { projectsApi } from '@/api/projects';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Spinner } from '@/components/ui/spinner';
import type { Job, Project } from '@/types';

interface SearchData {
  projects: Project[];
  jobs: Job[];
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (data) return;
    setLoading(true);
    try {
      const [projects, jobs] = await Promise.all([
        projectsApi.listProjects(),
        jobsApi.listAllJobs(),
      ]);
      setData({ projects: projects ?? [], jobs: jobs ?? [] });
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
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

  const go = (path: string, state?: Record<string, string>) => {
    setOpen(false);
    navigate(path, { state });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60 hover:border-border/90 flex h-8 w-full max-w-[260px] sm:max-w-[280px] md:max-w-xs items-center gap-2 rounded-xl px-2.5 text-xs shadow-2xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search projects, jobs, and navigation"
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground/75 group-hover:text-foreground transition-colors" />

        <span className="flex-1 text-left text-muted-foreground truncate font-normal">
          Quick search...
        </span>

        <kbd className="pointer-events-none hidden items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-2xs sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search projects, sync jobs, pages..."
          className="text-sm"
        />

        <CommandList className="max-h-[360px] p-1">
          <CommandEmpty className="text-muted-foreground py-8 text-center text-xs">
            {loading ? 'Searching...' : 'No results found.'}
          </CommandEmpty>

          {loading && !data && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Spinner className="size-3.5" />
              <span>Loading workspace data...</span>
            </div>
          )}

          <CommandGroup heading="Navigation">
            <CommandItem
              value="navigation dashboard overview"
              onSelect={() => go('/dashboard')}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <LayoutDashboard className="size-4 text-primary shrink-0" />
              <span className="flex-1">Dashboard</span>
              <span className="text-[11px] text-muted-foreground">Jump to</span>
            </CommandItem>
            <CommandItem
              value="navigation projects list all"
              onSelect={() => go('/projects')}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <FolderOpen className="size-4 text-primary shrink-0" />
              <span className="flex-1">Projects</span>
              <span className="text-[11px] text-muted-foreground">Jump to</span>
            </CommandItem>
            <CommandItem
              value="navigation organization team members"
              onSelect={() => go('/organization')}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <Building2 className="size-4 text-primary shrink-0" />
              <span className="flex-1">Organization</span>
              <span className="text-[11px] text-muted-foreground">Jump to</span>
            </CommandItem>
            <CommandItem
              value="navigation billing plans subscription"
              onSelect={() => go('/organization/billing/overview')}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <CreditCard className="size-4 text-primary shrink-0" />
              <span className="flex-1">Billing & Subscription</span>
              <span className="text-[11px] text-muted-foreground">Jump to</span>
            </CommandItem>
            <CommandItem
              value="navigation audit logs activity security"
              onSelect={() => go('/audit-logs')}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <ClipboardList className="size-4 text-primary shrink-0" />
              <span className="flex-1">Audit Logs</span>
              <span className="text-[11px] text-muted-foreground">Jump to</span>
            </CommandItem>
          </CommandGroup>

          {data && data.projects.length > 0 && (
            <CommandGroup heading="Projects">
              {data.projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  onSelect={() => go(`/projects/${p.id}`)}
                  className="gap-2.5 py-2 cursor-pointer"
                >
                  <FolderOpen className="text-primary size-4 shrink-0" />

                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      {p.sourcePlatformId} <ArrowRight className="size-2.5" />{' '}
                      {p.destPlatformId}
                    </span>
                  </div>

                  {p.status && (
                    <Badge variant="secondary" size="xs" className="shrink-0 capitalize">
                      {p.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data && data.jobs.length > 0 && (
            <CommandGroup heading="Sync Jobs">
              {data.jobs.map((j) => (
                <CommandItem
                  key={j.id}
                  value={`job ${j.name}`}
                  onSelect={() =>
                    go(`/projects/${j.projectId}/jobs/${j.id}`, {
                      jobBackTo: '/jobs',
                      jobBackLabel: 'Back to All Sync Jobs',
                    })
                  }
                  className="gap-2.5 py-2 cursor-pointer"
                >
                  <GitMerge className="text-primary size-4 shrink-0" />

                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="font-medium text-foreground truncate">{j.name}</span>
                    <span className="text-muted-foreground text-[11px] truncate">
                      {j.sourceObject && j.destObject
                        ? `${j.sourceObject} → ${j.destObject}`
                        : j.projectId}
                    </span>
                  </div>

                  {j.status && (
                    <Badge variant="outline" size="xs" className="shrink-0 capitalize">
                      {j.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        <div className="border-border/50 bg-muted/20 flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[10px] shadow-2xs">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <kbd className="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[10px] shadow-2xs">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <kbd className="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[10px] shadow-2xs">ESC</kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
