import { ArrowRight, Check, CheckCircle2, Wand2, X } from 'lucide-react';
import { useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MatchableField } from '@/lib/fieldMatching';

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

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        size="md"
        className="flex h-[85vh] max-h-[85vh] flex-col gap-0 p-0"
      >
        <DialogHeader className="gap-0 border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Wand2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Auto-map results</DialogTitle>
              <DialogDescription>
                We scanned {totalScanned} field{totalScanned !== 1 ? 's' : ''}.
                {preview.existingCount > 0
                  ? ` ${preview.existingCount} existing mapping${preview.existingCount !== 1 ? 's' : ''} left untouched.`
                  : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-6 py-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Card className="ring-border gap-4 py-4 shadow-none ring-1">
                <CardContent className="px-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold">
                      {preview.matched.length}
                    </span>
                    <span className="bg-success size-2 rounded-full" />
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                    Matched automatically
                  </div>
                </CardContent>
              </Card>
              <Card className="ring-border gap-4 py-4 shadow-none ring-1">
                <CardContent className="px-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold">
                      {preview.review.length}
                    </span>
                    <span className="bg-primary size-2 rounded-full" />
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                    To review
                  </div>
                </CardContent>
              </Card>
              <Card className="ring-border gap-4 py-4 shadow-none ring-1">
                <CardContent className="px-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold">
                      {preview.unmatched.length}
                    </span>
                    <span className="bg-muted-foreground size-2 rounded-full" />
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                    No match
                  </div>
                </CardContent>
              </Card>
            </div>

            {preview.matched.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <CheckCircle2 className="text-success size-4" />
                  <span className="text-sm font-bold">
                    Matched automatically
                  </span>
                  <span className="text-muted-foreground text-xs">
                    high confidence — applied
                  </span>
                </div>
                <div className="divide-y rounded-lg border">
                  {preview.matched.map((m) => (
                    <div
                      key={m.source.key}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {m.source.label || m.source.key}
                      </span>
                      <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-right font-semibold">
                        {m.dest.label || m.dest.key}
                      </span>
                      <span className="text-muted-foreground w-32 shrink-0 text-right text-xs">
                        {m.reason}
                      </span>
                      <span className="text-success w-10 shrink-0 text-right text-xs font-bold">
                        {m.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.review.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="bg-primary size-2 rounded-full" />
                  <span className="text-sm font-bold">
                    Review these suggestions
                  </span>
                  <span className="text-muted-foreground text-xs">
                    medium confidence — your call
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
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
                      <Card
                        key={r.source.key}
                        className="ring-border gap-4 py-4 shadow-none ring-1"
                      >
                        <CardContent className="flex flex-col gap-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {r.source.label || r.source.key}
                            </span>
                            <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />

                            {state.status === 'editing' ? (
                              <>
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
                                    className="h-8 flex-1"
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
                                  className="shrink-0"
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
                                  <X />
                                </Button>
                              </>
                            ) : (
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {destLabel}
                              </span>
                            )}

                            {state.status === 'accepted' ? (
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className="text-success flex items-center gap-1.5 text-xs font-semibold">
                                  <Check className="size-3.5" />
                                  Accepted
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
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
                          <div className="flex items-center gap-2.5">
                            <Progress
                              value={r.score}
                              className="h-1.5 max-w-40"
                            />
                            <span className="text-primary text-xs font-bold">
                              {r.score}% match
                            </span>
                            <span className="text-muted-foreground text-xs">
                              · {r.reason}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {preview.unmatched.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="bg-muted-foreground size-2 rounded-full" />
                  <span className="text-sm font-bold">No confident match</span>
                  <span className="text-muted-foreground text-xs">
                    map manually after applying
                  </span>
                </div>
                <div className="divide-y rounded-lg border">
                  {preview.unmatched.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                    >
                      <span className="font-semibold">{f.label || f.key}</span>
                      <Badge variant="outline" className="text-[10.5px]">
                        Manual
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t px-6 py-4 sm:justify-between">
          <span className="text-muted-foreground text-xs">
            Matched by name, known aliases &amp; field type
          </span>
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applyCount === 0}>
              Apply {applyCount} Mapping{applyCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
