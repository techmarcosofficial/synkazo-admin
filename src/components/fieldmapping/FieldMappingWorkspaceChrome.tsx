import { Check, Link2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

import HeadingPair from '@/components/shared/HeadingPair';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';

export function FieldMappingWorkspaceHeader({
  mappedCount,
  setToolbarContainer,
  dirty,
  filtersCount,
  defaultsCount,
  crossObjectCount,
  showCrossObject,
  onOpenFilters,
  onOpenDefaults,
  onOpenCrossObject,
  hideActionButtons = false,
}: {
  mappedCount: number;
  setToolbarContainer: (element: HTMLDivElement | null) => void;
  dirty?: boolean;
  filtersCount?: number;
  defaultsCount?: number;
  crossObjectCount?: number;
  showCrossObject?: boolean;
  onOpenFilters?: () => void;
  onOpenDefaults?: () => void;
  onOpenCrossObject?: () => void;
  hideActionButtons?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
      <HeadingPair
        level="h2"
        visualLevel="section"
        title="Field Mappings"
        trailing={
          <Badge variant="secondary" className="text-xs font-medium">
            {mappedCount} mapped
          </Badge>
        }
        subtitle="Map fields between your connected platforms to synchronize record data accurately."
        subtitleInTooltip
      />
      <div className="flex flex-wrap items-center gap-2">
        {!hideActionButtons && (
          <>
            {onOpenFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenFilters}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <ShieldCheck className="text-primary size-3.5" />
                <span>Job Filters</span>
                {filtersCount != null && filtersCount > 0 && (
                  <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">
                    {filtersCount}
                  </Badge>
                )}
              </Button>
            )}
            {showCrossObject && onOpenCrossObject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenCrossObject}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Link2 className="text-primary size-3.5" />
                <span>Cross-Object</span>
                {crossObjectCount != null && crossObjectCount > 0 && (
                  <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">
                    {crossObjectCount}
                  </Badge>
                )}
              </Button>
            )}
            {onOpenDefaults && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenDefaults}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Sparkles className="text-primary size-3.5" />
                <span>Default Values</span>
                {defaultsCount != null && defaultsCount > 0 && (
                  <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">
                    {defaultsCount}
                  </Badge>
                )}
              </Button>
            )}
          </>
        )}
        <div ref={setToolbarContainer} className="flex flex-wrap items-center gap-2" />
      </div>
    </div>
  );
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
