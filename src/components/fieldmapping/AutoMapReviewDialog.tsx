import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MatchableField } from '@/lib/fieldMatching';
import { cn } from '@/lib/utils';

export interface AutoMapPreviewRow {
  source: MatchableField;
  dest: MatchableField;
  score: number;
  reason: string;
}

export interface AutoMapPreview {
  /** High-confidence pairs, applied as-is. */
  matched: AutoMapPreviewRow[];
  /** Medium-confidence suggestions — the user accepts or repoints each one. */
  review: AutoMapPreviewRow[];
  /** Source fields with no confident candidate at all. */
  unmatched: FieldDef[];
  /** Existing mappings that Auto-map left untouched. */
  existingCount: number;
}

interface AutoMapReviewDialogProps {
  preview: AutoMapPreview;
  destFields: FieldDef[];
  onCancel: () => void;
  onApply: (rows: { source: MatchableField; dest: MatchableField }[]) => void;
}

type FilterView = 'all' | 'review' | 'matched' | 'unmatched';

export default function AutoMapReviewDialog({
  preview,
  destFields,
  onCancel,
  onApply,
}: AutoMapReviewDialogProps) {
  type RowStatus = 'pending' | 'editing' | 'accepted';
  const [reviewState, setReviewState] = useState<
    Record<string, { status: RowStatus; destKey: string }>
  >(() =>
    Object.fromEntries(
      preview.review.map((r) => [
        r.source.key,
        { status: 'pending' as RowStatus, destKey: r.dest.key },
      ]),
    ),
  );

  const [activeFilter, setActiveFilter] = useState<FilterView>('all');
  const [matchedExpanded, setMatchedExpanded] = useState(true);

  const takenDestKeys = new Set([
    ...preview.matched.map((m) => m.dest.key),
    ...Object.values(reviewState)
      .filter((s) => s.status === 'accepted')
      .map((s) => s.destKey),
  ]);

  const acceptedReview = preview.review.filter(
    (r) => reviewState[r.source.key]?.status === 'accepted',
  );
  const applyCount = preview.matched.length + acceptedReview.length;
  const totalScanned =
    preview.matched.length + preview.review.length + preview.unmatched.length;

  const handleApply = () => {
    const rows = [
      ...preview.matched.map((m) => ({ source: m.source, dest: m.dest })),
      ...acceptedReview.map((r) => {
        const destKey = reviewState[r.source.key].destKey;
        const dest = destFields.find((f) => f.key === destKey) ?? r.dest;
        return { source: r.source, dest };
      }),
    ];
    onApply(rows);
  };

  const handleAcceptAll = () => {
    setReviewState((prev) => {
      const next = { ...prev };
      for (const r of preview.review) {
        next[r.source.key] = {
          status: 'accepted',
          destKey: prev[r.source.key]?.destKey ?? r.dest.key,
        };
      }
      return next;
    });
  };

  const handleResetAll = () => {
    setReviewState(
      Object.fromEntries(
        preview.review.map((r) => [
          r.source.key,
          { status: 'pending' as RowStatus, destKey: r.dest.key },
        ]),
      ),
    );
  };

  const showReview =
    (activeFilter === 'all' || activeFilter === 'review') &&
    preview.review.length > 0;
  const showMatched =
    (activeFilter === 'all' || activeFilter === 'matched') &&
    preview.matched.length > 0;
  const showUnmatched =
    (activeFilter === 'all' || activeFilter === 'unmatched') &&
    preview.unmatched.length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        size="lg"
        padding="none"
        className="flex h-[82vh] max-h-[82vh] sm:max-w-[860px] flex-col gap-0 overflow-hidden"
      >
        <DialogHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              size="xs"
            >
              Field Matching
            </Badge>

            <Badge
              variant="secondary"
              size="xs"
              className="gap-1"
            >
              <ShieldCheck className="size-3 text-success shrink-0" />
              <span>
                Non-destructive
                {preview.existingCount > 0 &&
                  ` · ${preview.existingCount} existing intact`}
              </span>
            </Badge>

            {applyCount > 0 && (
              <Badge
                variant="secondary"
                size="xs"
                className="gap-1 font-semibold"
              >
                <Sparkles className="size-3 text-primary shrink-0" />
                <span>{applyCount} Mapping{applyCount !== 1 ? 's' : ''} Ready</span>
              </Badge>
            )}
          </div>

          <DialogTitle className="text-foreground mt-1.5 flex items-center gap-2 text-base font-semibold">
            <Wand2 className="text-primary size-5 shrink-0" />
            Auto-Map Suggestions &amp; Review
          </DialogTitle>

          <DialogDescription className="text-muted-foreground text-xs">
            Evaluated {totalScanned} unmapped field{totalScanned !== 1 ? 's' : ''}.
            {preview.existingCount > 0 ? (
              <>
                {' '}
                <strong className="text-foreground font-medium">
                  {preview.existingCount} existing mapping
                  {preview.existingCount !== 1 ? 's' : ''}
                </strong>{' '}
                will remain completely untouched.
              </>
            ) : (
              ' Review matched pairs and medium-confidence suggestions before applying.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 px-6 py-4">
            {/* Compact Segmented Summary Bar (replacing bulky cards) */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/40 p-1.5 text-xs dark:bg-muted/20">
              <button
                type="button"
                onClick={() =>
                  setActiveFilter((prev) =>
                    prev === 'matched' ? 'all' : 'matched',
                  )
                }
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all',
                  activeFilter === 'matched'
                    ? 'bg-card font-semibold ring-1 ring-border shadow-xs'
                    : 'hover:bg-card/60',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="bg-success size-2 shrink-0 rounded-full" />
                  <span className="text-muted-foreground truncate">
                    Matched automatically
                  </span>
                </div>
                <span className="text-foreground ml-2 text-sm font-bold">
                  {preview.matched.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter((prev) =>
                    prev === 'review' ? 'all' : 'review',
                  )
                }
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all',
                  activeFilter === 'review'
                    ? 'bg-card font-semibold ring-1 ring-border shadow-xs'
                    : 'hover:bg-card/60',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="bg-primary size-2 shrink-0 rounded-full" />
                  <span className="text-muted-foreground truncate">To review</span>
                </div>
                <div className="ml-2 flex items-center gap-1.5">
                  {acceptedReview.length > 0 && (
                    <span className="text-success text-[10px] font-semibold">
                      {acceptedReview.length} accepted
                    </span>
                  )}
                  <span className="text-foreground text-sm font-bold">
                    {preview.review.length}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter((prev) =>
                    prev === 'unmatched' ? 'all' : 'unmatched',
                  )
                }
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all',
                  activeFilter === 'unmatched'
                    ? 'bg-card font-semibold ring-1 ring-border shadow-xs'
                    : 'hover:bg-card/60',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="bg-muted-foreground/60 size-2 shrink-0 rounded-full" />
                  <span className="text-muted-foreground truncate">No match</span>
                </div>
                <span className="text-foreground ml-2 text-sm font-bold">
                  {preview.unmatched.length}
                </span>
              </button>
            </div>

            {/* Reassurance Callout */}
            {preview.existingCount > 0 && (
              <div className="border-success/20 bg-success/[0.06] dark:bg-success/[0.08] flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs">
                <ShieldCheck className="text-success size-4 shrink-0" />
                <div className="text-muted-foreground min-w-0 flex-1">
                  <strong className="text-foreground font-semibold">
                    Safe &amp; Non-destructive:
                  </strong>{' '}
                  Your{' '}
                  <strong className="text-foreground font-semibold">
                    {preview.existingCount} existing mapping
                    {preview.existingCount !== 1 ? 's' : ''}
                  </strong>{' '}
                  will not be changed or overwritten. Auto-map only introduces
                  pairs for unmapped fields.
                </div>
              </div>
            )}

            {/* Section 1: Review Suggestions (Flattened High-Density List) */}
            {showReview && (
              <div className="border-border/70 bg-card divide-border/60 overflow-hidden rounded-xl border divide-y">
                <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between dark:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary size-2 rounded-full" />
                    <span className="text-foreground text-xs font-bold tracking-wide uppercase">
                      Review Suggestions ({preview.review.length})
                    </span>
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      — medium confidence, accept or repoint
                    </span>
                  </div>

                  {preview.review.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {acceptedReview.length < preview.review.length ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-primary hover:text-primary hover:bg-primary/10 h-7 text-xs font-medium"
                          onClick={handleAcceptAll}
                        >
                          <Check className="mr-1 size-3" />
                          Accept all ({preview.review.length})
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-muted-foreground hover:text-foreground h-7 text-xs"
                          onClick={handleResetAll}
                        >
                          <RotateCcw className="mr-1 size-3" />
                          Reset all
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="divide-border/50 divide-y">
                  {preview.review.map((r) => {
                    const state = reviewState[r.source.key];
                    const options = destFields.filter(
                      (f) =>
                        !f.readOnly &&
                        (f.key === state.destKey || !takenDestKeys.has(f.key)),
                    );
                    const destLabel =
                      destFields.find((f) => f.key === state.destKey)?.label ||
                      state.destKey;

                    return (
                      <div
                        key={r.source.key}
                        className={cn(
                          'flex flex-col gap-2.5 p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                          state.status === 'accepted'
                            ? 'bg-success/[0.04] dark:bg-success/[0.06]'
                            : 'hover:bg-muted/25',
                        )}
                      >
                        {/* Mapping Pair: Source -> Destination */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {/* Source Field */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-foreground truncate text-sm font-semibold">
                                {r.source.label || r.source.key}
                              </span>
                              {r.source.type && (
                                <Badge
                                  variant="secondary"
                                  size="xs"
                                  className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-normal shrink-0"
                                >
                                  {r.source.type}
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground truncate font-mono text-[10.5px]">
                              {r.source.key}
                            </div>
                          </div>

                          <ArrowRight className="text-muted-foreground size-4 shrink-0" />

                          {/* Destination Field (Display or Select) */}
                          <div className="min-w-0 flex-1">
                            {state.status === 'editing' ? (
                              <div className="flex items-center gap-1.5">
                                <Select
                                  value={state.destKey}
                                  onValueChange={(destKey) =>
                                    setReviewState((prev) => ({
                                      ...prev,
                                      [r.source.key]: {
                                        status: 'editing',
                                        destKey,
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger
                                    size="sm"
                                    className="h-8 flex-1 text-xs"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((f) => (
                                      <SelectItem key={f.key} value={f.key}>
                                        {f.label || f.key}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  className="h-8 w-8 shrink-0"
                                  aria-label="Cancel change"
                                  onClick={() =>
                                    setReviewState((prev) => ({
                                      ...prev,
                                      [r.source.key]: {
                                        status: 'pending',
                                        destKey: r.dest.key,
                                      },
                                    }))
                                  }
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-foreground truncate text-sm font-semibold">
                                    {destLabel}
                                  </div>
                                  <div className="text-muted-foreground truncate font-mono text-[10.5px]">
                                    {state.destKey}
                                  </div>
                                </div>
                                {state.status === 'accepted' && (
                                  <span
                                    role="status"
                                    className="text-success inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
                                  >
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className="size-3.5"
                                    />
                                    Accepted
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match Quality & Actions */}
                        <div className="border-border/40 flex items-center justify-between gap-3 border-t pt-2 shrink-0 sm:border-t-0 sm:pt-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Badge
                              variant="secondary"
                              size="xs"
                              className="font-mono font-bold"
                            >
                              {r.score}%
                            </Badge>
                            <span
                              className="text-muted-foreground max-w-32 truncate text-[11px] sm:max-w-40"
                              title={r.reason}
                            >
                              · {r.reason}
                            </span>
                          </div>

                          {state.status === 'accepted' ? (
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setReviewState((prev) => ({
                                    ...prev,
                                    [r.source.key]: {
                                      status: 'pending',
                                      destKey: r.dest.key,
                                    },
                                  }))
                                }
                                className="w-16 h-8 text-xs"
                              >
                                Undo
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() =>
                                  setReviewState((prev) => ({
                                    ...prev,
                                    [r.source.key]: {
                                      ...prev[r.source.key],
                                      status: 'editing',
                                    },
                                  }))
                                }
                              >
                                Change
                              </Button>
                            </div>
                          ) : state.status === 'pending' ? (
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                size="sm"
                                className="w-16 h-8 text-xs"
                                onClick={() =>
                                  setReviewState((prev) => ({
                                    ...prev,
                                    [r.source.key]: {
                                      status: 'accepted',
                                      destKey: prev[r.source.key].destKey,
                                    },
                                  }))
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() =>
                                  setReviewState((prev) => ({
                                    ...prev,
                                    [r.source.key]: {
                                      ...prev[r.source.key],
                                      status: 'editing',
                                    },
                                  }))
                                }
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                size="sm"
                                className="w-16 h-8 text-xs"
                                onClick={() =>
                                  setReviewState((prev) => ({
                                    ...prev,
                                    [r.source.key]: {
                                      status: 'accepted',
                                      destKey: prev[r.source.key].destKey,
                                    },
                                  }))
                                }
                              >
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Matched Automatically (High Confidence) */}
            {showMatched && (
              <div className="border-border/70 bg-card divide-border/60 overflow-hidden rounded-xl border divide-y">
                <div
                  className="bg-muted/40 px-4 py-2.5 flex cursor-pointer items-center justify-between dark:bg-muted/20"
                  onClick={() => setMatchedExpanded((prev) => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-success size-4 shrink-0" />
                    <span className="text-foreground text-xs font-bold tracking-wide uppercase">
                      Matched Automatically ({preview.matched.length})
                    </span>
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      — high confidence matches applied automatically
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="gap-1 font-medium"
                    >
                      <CheckCircle2 className="size-3 text-success shrink-0" />
                      <span>Applied</span>
                    </Badge>
                    {matchedExpanded ? (
                      <ChevronUp className="text-muted-foreground size-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground size-4" />
                    )}
                  </div>
                </div>

                {matchedExpanded && (
                  <div className="divide-border/50 max-h-[260px] divide-y overflow-y-auto">
                    {preview.matched.map((m) => (
                      <div
                        key={m.source.key}
                        className="hover:bg-muted/20 flex items-center gap-3 px-4 py-2 text-xs transition-colors"
                      >
                        <div className="min-w-0 flex-1 truncate">
                          <span className="text-foreground font-semibold">
                            {m.source.label || m.source.key}
                          </span>
                          <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
                            ({m.source.key})
                          </span>
                        </div>
                        <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                        <div className="min-w-0 flex-1 truncate text-right">
                          <span className="text-foreground font-semibold">
                            {m.dest.label || m.dest.key}
                          </span>
                          <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
                            ({m.dest.key})
                          </span>
                        </div>
                        <span
                          className="text-muted-foreground w-28 shrink-0 truncate text-right text-[11px]"
                          title={m.reason}
                        >
                          {m.reason}
                        </span>
                        <Badge
                          variant="secondary"
                          size="xs"
                          className="w-12 shrink-0 justify-center font-mono font-bold"
                        >
                          {m.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 3: No Match (Unmatched Fields) */}
            {showUnmatched && (
              <div className="border-border/70 bg-card divide-border/60 overflow-hidden rounded-xl border divide-y">
                <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between dark:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/60 size-2 shrink-0 rounded-full" />
                    <span className="text-foreground text-xs font-bold tracking-wide uppercase">
                      No Confident Match ({preview.unmatched.length})
                    </span>
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      — will remain unmapped; map manually anytime
                    </span>
                  </div>
                  <Badge variant="secondary" size="xs">
                    Manual
                  </Badge>
                </div>

                <div className="divide-border/50 max-h-[200px] divide-y overflow-y-auto">
                  {preview.unmatched.map((f) => (
                    <div
                      key={f.key}
                      className="hover:bg-muted/20 flex items-center justify-between gap-3 px-4 py-2 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-foreground font-semibold">
                          {f.label || f.key}
                        </span>
                        <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
                          ({f.key})
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        size="xs"
                      >
                        Unmapped
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="bg-muted/30 border-border/70 flex-col gap-3 border-t px-6 py-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <ShieldCheck className="text-success size-4 shrink-0" />
            <span>
              {preview.existingCount > 0
                ? `Existing ${preview.existingCount} mapping${preview.existingCount !== 1 ? 's' : ''} preserved intact.`
                : 'Matched by name, aliases & data type.'}
            </span>
          </div>

          <div className="flex gap-2.5 shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applyCount === 0}
              className="gap-1.5"
            >
              <Sparkles className="size-3.5" />
              Apply {applyCount} Mapping{applyCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
