import { Check, Link2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

import { IconLegend } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';

export function FieldMappingWorkspaceHeader({
  mappedCount,
  dirty,
  filtersCount,
  defaultsCount,
  crossObjectCount,
  showCrossObject,
  onOpenFilters,
  onOpenDefaults,
  onOpenCrossObject,
  setToolbarContainer,
}: {
  mappedCount: number;
  dirty: boolean;
  filtersCount: number;
  defaultsCount: number;
  crossObjectCount: number;
  showCrossObject: boolean;
  onOpenFilters: () => void;
  onOpenDefaults: () => void;
  onOpenCrossObject: () => void;
  setToolbarContainer: (element: HTMLDivElement | null) => void;
}) {
  return <div className="bg-muted/30 dark:bg-card/90 border-border flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-foreground text-base font-semibold tracking-tight">Field Mappings</h3>
        <IconLegend size="icon-xs" variant="ghost" />
        <Badge variant="secondary" className="text-xs font-medium">{mappedCount} mapped</Badge>
        {dirty && <span className="text-muted-foreground hidden items-center gap-1.5 text-xs font-normal sm:inline-flex"><span className="bg-warning size-1.5 animate-pulse rounded-full" />Draft saved locally</span>}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">Map fields between your connected platforms to synchronize record data accurately.</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onOpenFilters} className="h-8 gap-1.5 text-xs font-medium"><ShieldCheck className="text-primary size-3.5" /><span>Job Filters</span>{filtersCount > 0 && <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">{filtersCount}</Badge>}</Button>
      {showCrossObject && <Button type="button" variant="outline" size="sm" onClick={onOpenCrossObject} className="h-8 gap-1.5 text-xs font-medium"><Link2 className="text-primary size-3.5" /><span>Cross-Object</span>{crossObjectCount > 0 && <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">{crossObjectCount}</Badge>}</Button>}
      <Button type="button" variant="outline" size="sm" onClick={onOpenDefaults} className="h-8 gap-1.5 text-xs font-medium"><Sparkles className="text-primary size-3.5" /><span>Default Values</span>{defaultsCount > 0 && <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">{defaultsCount}</Badge>}</Button>
      <div ref={setToolbarContainer} className="flex flex-wrap items-center gap-2" />
    </div>
  </div>;
}

export function FieldMappingDraftFooter({
  dirty,
  saving,
  saved,
  onDiscard,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const { state: sidebarState } = useSidebar();
  if (!dirty) return null;
  return <div className={`border-border/60 bg-card/35 dark:bg-card/40 fixed right-0 bottom-0 left-0 z-40 max-w-full overflow-x-clip border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-200 dark:border-white/10 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] ${sidebarState === 'collapsed' ? 'md:left-(--sidebar-width-icon)' : 'md:left-(--sidebar-width)'}`}>
    <div className="container mx-auto flex max-w-full min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5 lg:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="relative mt-1 flex size-2.5 shrink-0 items-center justify-center"><span className="bg-warning/75 absolute inline-flex size-full animate-ping rounded-full opacity-75" /><span className="bg-warning relative inline-flex size-2 rounded-full shadow-xs" /></div>
        <div className="min-w-0"><p className="text-foreground text-sm leading-snug font-semibold">Unsaved draft</p><p className="text-muted-foreground mt-0.5 text-xs leading-normal">Your changes are auto-saved locally. Save to apply them to your sync job, or discard to restore saved state.</p></div>
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={onDiscard} disabled={saving} className="bg-background/60 hover:bg-background border-border/80 dark:bg-background/30 dark:hover:bg-background/60 cursor-pointer shadow-2xs"><RotateCcw className="size-3.5" /> Discard changes</Button>
        <Button onClick={onSave} disabled={saving} variant="default" className="cursor-pointer shadow-xs">{saving ? <Spinner /> : <Check className="size-3.5" />}{saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}</Button>
      </div>
    </div>
  </div>;
}
