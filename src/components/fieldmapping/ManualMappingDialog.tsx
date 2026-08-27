import {
  ArrowRight,
  Check,
  Link2,
  ListPlus,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import EmptyValuePolicy, { isValidDefaultValue } from './EmptyValuePolicy';
import {
  FieldSelect,
  requiredReasons,
  TRANSFORM_UPGRADE_MESSAGE,
  type FieldDef,
  type OnEmptyPolicy,
} from './FieldMappingCanvas';
import RuleBuilderModal from './RuleBuilderModal';

import { jobsApi } from '@/api/jobs';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
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
import { Spinner } from '@/components/ui/spinner';
import {
  explainFieldPair,
  type FieldMatchExplanation,
} from '@/lib/fieldMatching';
import type { Rule } from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';
import type { FieldMapping, RuleMatchScoreResult } from '@/types';

/** Same band Auto-map uses to split "applied automatically" from "review" — reused
 *  here to split saved manual cards into Good Match / Needs Review. */
const GOOD_MATCH_THRESHOLD = 85;

interface DraftRow {
  id: string;
  sourceKey: string;
  destKey: string;
  editing: boolean;
  /** Last-saved keys, restored if the user cancels out of re-editing a saved card. */
  savedSourceKey: string;
  savedDestKey: string;
  /** Transform rules configured here, before the mapping exists on the canvas. */
  rules: Rule[];
  onEmpty: OnEmptyPolicy;
  defaultValue: string;
}

interface ScoreState {
  status: 'loading' | 'ready' | 'error';
  result?: RuleMatchScoreResult;
}

export interface ManualMappingPrefill {
  sourceKey?: string;
  destKey?: string;
}

/** One mapping the user built here, with anything they configured alongside it. */
export interface ManualMappingResult {
  source: FieldDef;
  dest: FieldDef;
  rules?: Rule[];
  onEmpty?: OnEmptyPolicy;
  defaultValue?: string;
}

interface ManualMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFields: FieldDef[];
  destFields: FieldDef[];
  readOnlyKeys: Set<string>;
  isDuplicatePair: (source: string, dest: string) => boolean;
  highlightSourceRequired: boolean;
  highlightDestRequired: boolean;
  sourcePlatformLabel: string;
  destPlatformLabel: string;
  prefill: ManualMappingPrefill | null;
  onApply: (pairs: ManualMappingResult[]) => void;
  projectId?: string;
  sourceObject?: string;
  /** Real (already-persisted) job id — enables the data-based match % readout
   *  once a rule is attached. Absent during job creation. */
  jobId?: string;
}

let draftIdCounter = 0;
const nextDraftId = () => `draft-${++draftIdCounter}`;

function emptyDraft(prefill?: ManualMappingPrefill | null): DraftRow {
  return {
    id: nextDraftId(),
    sourceKey: prefill?.sourceKey ?? '',
    destKey: prefill?.destKey ?? '',
    editing: true,
    savedSourceKey: '',
    savedDestKey: '',
    rules: [],
    onEmpty: 'none',
    defaultValue: '',
  };
}

function ScoreBlock({ explanation }: { explanation: FieldMatchExplanation }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <Progress value={explanation.score} className="h-1.5 max-w-40" />
        <span className="text-primary text-xs font-bold">
          {explanation.score}% match
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {explanation.reasons.map((r) => (
          <li
            key={r.label}
            className={
              'flex items-center gap-1.5 text-xs ' +
              (r.positive ? 'text-success' : 'text-muted-foreground')
            }
          >
            {r.positive ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <X className="size-3 shrink-0" />
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleScoreBlock({
  score,
  onRetry,
}: {
  score: ScoreState;
  onRetry: () => void;
}) {
  if (score.status === 'loading') {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Spinner className="size-3" /> Checking real data…
      </div>
    );
  }
  if (score.status === 'error') {
    return (
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground text-xs">
          Couldn&apos;t check real data.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onRetry}
        >
          <RefreshCw className="size-3" /> Retry
        </Button>
      </div>
    );
  }
  const result = score.result;
  if (!result) return null;
  if (result.unavailable || result.totalCount === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No synced data available yet.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <Badge variant="secondary" className="gap-1">
        <Link2 className="size-2.5" /> Rule added
      </Badge>
      <Progress value={result.percentage ?? 0} className="h-1.5 max-w-32" />
      <span className="text-primary text-xs font-bold">
        {result.percentage}% Match
      </span>
      <span className="text-muted-foreground text-xs">
        ({result.matchCount}/{result.totalCount}
        {result.capped ? '+' : ''} records)
      </span>
    </div>
  );
}

export default function ManualMappingDialog({
  open,
  onOpenChange,
  sourceFields,
  destFields,
  readOnlyKeys,
  isDuplicatePair,
  highlightSourceRequired,
  highlightDestRequired,
  sourcePlatformLabel,
  destPlatformLabel,
  prefill,
  onApply,
  projectId,
  sourceObject,
  jobId,
}: ManualMappingDialogProps) {
  const [drafts, setDrafts] = useState<DraftRow[]>(() =>
    prefill ? [emptyDraft(prefill)] : [],
  );
  /** Draft whose rule builder is open, if any. Nested inside this dialog so a
   *  mapping can be fully configured before it ever reaches the canvas. */
  const [rulesFor, setRulesFor] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const entitlements = useEntitlements();
  const canUseTransforms = entitlements.transformRules;
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();

  // Re-seed whenever the dialog transitions from closed to open, so a fresh
  // "Choose field" prefill (or a clean slate) replaces whatever was left over
  // from the last time it was open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setDrafts(prefill ? [emptyDraft(prefill)] : []);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const fieldByKey = (fields: FieldDef[], key: string) =>
    fields.find((f) => f.key === key);

  const explainDraft = (d: DraftRow): FieldMatchExplanation | null => {
    if (!d.sourceKey || !d.destKey) return null;
    const sf = fieldByKey(sourceFields, d.sourceKey);
    const df = fieldByKey(destFields, d.destKey);
    if (!sf || !df) return null;
    return explainFieldPair(sf, df);
  };

  const validationError = (d: DraftRow): string | null => {
    if (!d.sourceKey || !d.destKey) return null;
    if (readOnlyKeys.has(d.destKey)) {
      return "That destination field is read-only and can't be mapped to.";
    }
    const sf = fieldByKey(sourceFields, d.sourceKey);
    const df = fieldByKey(destFields, d.destKey);
    const dupExisting =
      d.sourceKey !== d.savedSourceKey || d.destKey !== d.savedDestKey
        ? isDuplicatePair(d.sourceKey, d.destKey)
        : false;
    const dupDraft = drafts.some(
      (o) =>
        o.id !== d.id &&
        !o.editing &&
        o.sourceKey === d.sourceKey &&
        o.destKey === d.destKey,
    );
    if (dupExisting || dupDraft) {
      return `"${sf?.label ?? d.sourceKey}" is already mapped to "${df?.label ?? d.destKey}". Pick a different destination field.`;
    }
    return null;
  };

  const savedDrafts = drafts.filter(
    (d) => !d.editing && d.sourceKey && d.destKey,
  );
  const draftCount = drafts.filter(
    (d) => d.editing || !d.sourceKey || !d.destKey,
  ).length;
  const scoredSaved = savedDrafts.map((d) => ({
    draft: d,
    explanation: explainDraft(d)!,
  }));
  const goodMatchCount = scoredSaved.filter(
    (s) => s.explanation.score >= GOOD_MATCH_THRESHOLD,
  ).length;
  const needsReviewCount = scoredSaved.length - goodMatchCount;
  const applyCount = savedDrafts.length;

  const rulesDraft = drafts.find((d) => d.id === rulesFor) ?? null;

  const addDraft = () => setDrafts((prev) => [...prev, emptyDraft()]);

  const removeDraft = (id: string) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  const updateDraft = (id: string, patch: Partial<DraftRow>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );

  const startEdit = (id: string) => updateDraft(id, { editing: true });

  const cancelEdit = (d: DraftRow) =>
    updateDraft(d.id, {
      editing: false,
      sourceKey: d.savedSourceKey,
      destKey: d.savedDestKey,
    });

  const saveDraft = (d: DraftRow) => {
    if (!d.sourceKey || !d.destKey || validationError(d)) return;
    // A rule attached to the old field pair is stale for a new one — drop it
    // rather than silently showing a mismatched score.
    const pairChanged =
      d.sourceKey !== d.savedSourceKey || d.destKey !== d.savedDestKey;
    if (pairChanged && d.rules.length) {
      setScores((prev) => {
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
    }
    updateDraft(d.id, {
      editing: false,
      savedSourceKey: d.sourceKey,
      savedDestKey: d.destKey,
      ...(pairChanged ? { rules: [] } : {}),
    });
  };

  const fetchScore = (draft: DraftRow) => {
    if (!projectId || !jobId || !draft.rules.length) return;
    setScores((prev) => ({ ...prev, [draft.id]: { status: 'loading' } }));
    jobsApi
      .ruleMatchScore(projectId, jobId, {
        sourceField: draft.sourceKey,
        destField: draft.destKey,
        rules: draft.rules,
      })
      .then((result) => {
        setScores((prev) => ({
          ...prev,
          [draft.id]: { status: 'ready', result },
        }));
      })
      .catch(() => {
        setScores((prev) => ({ ...prev, [draft.id]: { status: 'error' } }));
      });
  };

  const handleApply = () => {
    const pairs = savedDrafts
      .map((d): ManualMappingResult | null => {
        const source = fieldByKey(sourceFields, d.sourceKey);
        const dest = fieldByKey(destFields, d.destKey);
        return source && dest
          ? {
              source,
              dest,
              rules: d.rules,
              onEmpty: d.onEmpty,
              defaultValue: d.defaultValue,
            }
          : null;
      })
      .filter((p): p is ManualMappingResult => p !== null);
    onApply(pairs);
  };

  /** A "use a default" choice with nothing typed in, or a value that doesn't match
   *  the field's type (e.g. text in a number field), would either behave like "leave
   *  it empty" or get rejected by the destination — both block Apply the same way an
   *  unfinished pair does. */
  const incompleteDefault = savedDrafts.some((d) => {
    if (d.onEmpty !== 'default') return false;
    const df = fieldByKey(destFields, d.destKey);
    const sf = fieldByKey(sourceFields, d.sourceKey);
    const fieldType = df?.type ?? sf?.type;
    return !isValidDefaultValue(fieldType, d.defaultValue);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="md"
          className="flex h-[85vh] max-h-[85vh] flex-col gap-0 p-0"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="gap-0 border-b px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <ListPlus className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle>Manual Field Mapping</DialogTitle>
                <DialogDescription>
                  Create one or more mappings manually. We&apos;ll estimate how
                  well each mapping matches.
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
                        {draftCount}
                      </span>
                      <span className="bg-muted-foreground size-2 rounded-full" />
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                      Draft
                    </div>
                  </CardContent>
                </Card>
                <Card className="ring-border gap-4 py-4 shadow-none ring-1">
                  <CardContent className="px-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold">
                        {goodMatchCount}
                      </span>
                      <span className="bg-success size-2 rounded-full" />
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                      Good Match
                    </div>
                  </CardContent>
                </Card>
                <Card className="ring-border gap-4 py-4 shadow-none ring-1">
                  <CardContent className="px-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold">
                        {needsReviewCount}
                      </span>
                      <span className="bg-primary size-2 rounded-full" />
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs font-semibold">
                      Needs Review
                    </div>
                  </CardContent>
                </Card>
              </div>

              {drafts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <ListPlus className="text-muted-foreground size-5" />
                  <p className="text-muted-foreground text-sm">
                    No mappings yet. Add your first field mapping below.
                  </p>
                  <Button variant="outline" size="sm" onClick={addDraft}>
                    <Plus /> Add Mapping
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {drafts.map((d) => {
                    const explanation = explainDraft(d);
                    const error = validationError(d);
                    const sf = fieldByKey(sourceFields, d.sourceKey);
                    const df = fieldByKey(destFields, d.destKey);
                    const availDest = d.sourceKey
                      ? destFields.filter(
                          (f) =>
                            !f.readOnly && !isDuplicatePair(d.sourceKey, f.key),
                        )
                      : destFields.filter((f) => !f.readOnly);

                    // A default value is only offered where it can actually save a
                    // record: a field one of the two platforms requires, and only
                    // while that side's requirement is actually active for this
                    // job (e.g. ServiceTitan's required flag only counts on a
                    // two-way job). Offering it on every mapping would bury the
                    // fields that need it.
                    const pairReasons = requiredReasons({
                      sourceField: sf,
                      destField: df,
                      sourceActive: highlightSourceRequired,
                      destActive: highlightDestRequired,
                      sourcePlatformLabel,
                      destPlatformLabel,
                    });
                    const activeRuleCount = d.rules.filter(
                      (r) => r.enabled !== false,
                    ).length;

                    if (!d.editing) {
                      const score = scores[d.id];
                      return (
                        <Card
                          key={d.id}
                          className="ring-border gap-4 py-4 shadow-none ring-1"
                        >
                          <CardContent className="flex flex-col gap-2.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {sf?.label || d.sourceKey}
                                {highlightSourceRequired && sf?.required && (
                                  <span className="text-destructive ml-0.5">
                                    *
                                  </span>
                                )}
                              </span>
                              <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {df?.label || d.destKey}
                                {highlightDestRequired && df?.required && (
                                  <span className="text-destructive ml-0.5">
                                    *
                                  </span>
                                )}
                              </span>
                              <div className="flex shrink-0 gap-1.5">
                                <Button
                                  type="button"
                                  variant={
                                    activeRuleCount > 0
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  size="sm"
                                  onClick={() =>
                                    canUseTransforms
                                      ? setRulesFor(d.id)
                                      : promptUpgrade(TRANSFORM_UPGRADE_MESSAGE)
                                  }
                                >
                                  {!canUseTransforms ? (
                                    <Lock />
                                  ) : activeRuleCount > 0 ? (
                                    <Zap />
                                  ) : (
                                    <Plus />
                                  )}
                                  {activeRuleCount > 0
                                    ? `Edit Rule${activeRuleCount > 1 ? ` (${activeRuleCount})` : ''}`
                                    : 'Add Rule'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(d.id)}
                                >
                                  <Pencil /> Change
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  aria-label="Remove mapping"
                                  onClick={() => removeDraft(d.id)}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            </div>
                            {score ? (
                              <RuleScoreBlock
                                score={score}
                                onRetry={() => fetchScore(d)}
                              />
                            ) : (
                              explanation && (
                                <ScoreBlock explanation={explanation} />
                              )
                            )}
                            {pairReasons.length > 0 && (
                              <div className="mt-1 border-t pt-3">
                                <EmptyValuePolicy
                                  reasons={pairReasons}
                                  value={{
                                    onEmpty: d.onEmpty,
                                    defaultValue: d.defaultValue,
                                  }}
                                  onChange={(v) => updateDraft(d.id, v)}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card
                        key={d.id}
                        className="ring-border gap-4 py-4 shadow-none ring-1"
                      >
                        <CardContent className="flex flex-col gap-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <FieldSelect
                              fields={sourceFields}
                              value={d.sourceKey}
                              onChange={(v) => {
                                const patch: Partial<DraftRow> = {
                                  sourceKey: v,
                                };
                                if (
                                  d.destKey &&
                                  isDuplicatePair(v, d.destKey)
                                ) {
                                  patch.destKey = '';
                                }
                                updateDraft(d.id, patch);
                              }}
                              placeholder="Source field…"
                              highlightRequired={highlightSourceRequired}
                            />
                            <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                            <FieldSelect
                              fields={availDest}
                              value={d.destKey}
                              onChange={(v) =>
                                updateDraft(d.id, { destKey: v })
                              }
                              placeholder="Destination field…"
                              highlightRequired={highlightDestRequired}
                            />
                            {d.savedSourceKey && d.savedDestKey && (
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="shrink-0"
                                aria-label="Cancel change"
                                onClick={() => cancelEdit(d)}
                              >
                                <X />
                              </Button>
                            )}
                          </div>

                          {explanation && (
                            <ScoreBlock explanation={explanation} />
                          )}

                          {error ? (
                            <p className="text-destructive text-xs">{error}</p>
                          ) : null}

                          <div className="flex justify-end gap-1.5">
                            {/* A rule transforms the value on its way into the
                                destination, so both ends have to be chosen before
                                there is anything to configure. */}
                            <Button
                              variant={
                                activeRuleCount > 0 ? 'secondary' : 'outline'
                              }
                              size="sm"
                              className="mr-auto"
                              disabled={!d.sourceKey || !d.destKey}
                              onClick={() =>
                                canUseTransforms
                                  ? setRulesFor(d.id)
                                  : promptUpgrade(TRANSFORM_UPGRADE_MESSAGE)
                              }
                            >
                              {!canUseTransforms ? <Lock /> : <Zap />}
                              {activeRuleCount > 0
                                ? `${activeRuleCount} rule${activeRuleCount > 1 ? 's' : ''}`
                                : 'Add rule'}
                            </Button>
                            {!(d.savedSourceKey && d.savedDestKey) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeDraft(d.id)}
                              >
                                Remove
                              </Button>
                            )}
                            <Button
                              size="sm"
                              disabled={!d.sourceKey || !d.destKey || !!error}
                              onClick={() => saveDraft(d)}
                            >
                              Save
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Button
                    variant="outline"
                    className="self-start"
                    onClick={addDraft}
                  >
                    <Plus /> Add Mapping
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row items-center justify-between gap-3 border-t px-6 py-4 sm:justify-between">
            <span
              className={cn(
                'text-xs',
                incompleteDefault
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {incompleteDefault
                ? 'Enter a valid default value for the mapping set to "Use a default value".'
                : applyCount > 0
                  ? `${applyCount} mapping${applyCount !== 1 ? 's' : ''} ready to apply`
                  : 'Add and save at least one mapping'}
            </span>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={applyCount === 0 || incompleteDefault}
              >
                Apply {applyCount} Mapping{applyCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rulesDraft && (
        <RuleBuilderModal
          mapping={
            {
              sourceField: rulesDraft.sourceKey,
              destField: rulesDraft.destKey,
            } as FieldMapping
          }
          destKey={rulesDraft.destKey}
          initialRules={rulesDraft.rules}
          sourceFields={sourceFields}
          destFields={destFields}
          projectId={projectId}
          sourceObject={sourceObject}
          onSave={(rules) => {
            updateDraft(rulesDraft.id, { rules });
            fetchScore({ ...rulesDraft, rules });
            setRulesFor(null);
          }}
          onClose={() => setRulesFor(null)}
        />
      )}
      {upgradeDialog}
    </>
  );
}
