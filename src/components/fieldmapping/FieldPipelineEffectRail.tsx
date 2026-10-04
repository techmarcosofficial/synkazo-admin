import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Info,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { associationsApi } from '@/api/associations';
import {
  executeRulePipeline,
  RULE_DEFINITIONS,
  type Rule,
} from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import type { ConditionOperator, ExcludeCondition } from '@/types/conditions';
import type { FieldDef, MappingUpdatePolicy, OnEmptyPolicy } from './FieldMappingCanvas';

export interface FieldPipelineEffectRailProps {
  sourceKey: string;
  destKey: string;
  sourceFieldDef?: FieldDef;
  destFieldDef?: FieldDef;
  rules: Rule[];
  onEmpty: OnEmptyPolicy;
  defaultValue: string;
  updatePolicy: MappingUpdatePolicy;
  isMatch: boolean;
  hasSkipRule?: boolean;
  skipOperator?: ConditionOperator;
  skipValue?: string;
  projectId?: string;
  sourceObject?: string;
  className?: string;
}

export function buildStepTrace(
  input: string,
  rules: Rule[],
): Array<{
  index: number;
  label: string;
  output: string;
  enabled: boolean;
  failed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  bypassed?: boolean;
}> {
  let current = input;
  let failed = false;
  let pipelineSkipped = false;

  return rules.map((rule, index) => {
    const enabled = rule.enabled !== false;
    let stepSkipped = false;
    let stepSkipReason = '';

    if (enabled && !failed && !pipelineSkipped) {
      try {
        current = String(executeRulePipeline(current, [rule]));
        if (current.startsWith('__SKIPPED__:')) {
          pipelineSkipped = true;
          stepSkipped = true;
          stepSkipReason = current.replace('__SKIPPED__:', '');
        }
      } catch {
        current = '(error)';
        failed = true;
      }
    }
    const def = RULE_DEFINITIONS.find((d) => d.type === rule.type);
    return {
      index,
      label: def?.label || rule.type,
      output: current,
      enabled,
      failed,
      skipped: stepSkipped,
      skipReason: stepSkipReason,
      bypassed: pipelineSkipped && !stepSkipped,
    };
  });
}

function evaluateSkipCondition(
  rawInput: string,
  operator: ConditionOperator,
  targetValue: string,
): boolean {
  const v = rawInput.trim();
  const target = (targetValue ?? '').trim();
  const empty = v === '';

  switch (operator) {
    case 'is_empty':
      return empty;
    case 'is_not_empty':
      return !empty;
    case 'equals':
      return v.toLowerCase() === target.toLowerCase();
    case 'not_equals':
      return v.toLowerCase() !== target.toLowerCase();
    case 'contains':
      return v.toLowerCase().includes(target.toLowerCase());
    case 'not_contains':
      return !v.toLowerCase().includes(target.toLowerCase());
    case 'starts_with':
      return v.toLowerCase().startsWith(target.toLowerCase());
    case 'ends_with':
      return v.toLowerCase().endsWith(target.toLowerCase());
    default:
      return false;
  }
}

export default function FieldPipelineEffectRail({
  sourceKey,
  destKey,
  sourceFieldDef,
  destFieldDef,
  rules,
  onEmpty,
  defaultValue,
  updatePolicy,
  isMatch,
  hasSkipRule,
  skipOperator,
  skipValue,
  projectId,
  sourceObject,
  className,
}: FieldPipelineEffectRailProps) {
  const [sourceSample, setSourceSample] = useState<string>('');
  const [testInput, setTestInput] = useState<string>(' Sample Input ');
  const [loadingSample, setLoadingSample] = useState(false);

  // Load real source sample if available
  useEffect(() => {
    if (!projectId || !sourceObject || !sourceKey) return;
    let cancelled = false;
    setLoadingSample(true);

    associationsApi
      .getSampleRecord(projectId, sourceObject)
      .then((record) => {
        if (!record || cancelled) return;
        const val = record[sourceKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const s = String(val);
          setSourceSample(s);
          setTestInput(s);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSample(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, sourceObject, sourceKey]);

  // Step 1 -> Transforms pipeline
  const traceSteps = useMemo(
    () => buildStepTrace(testInput, rules),
    [testInput, rules],
  );

  const postTransformValue = useMemo(() => {
    if (traceSteps.length === 0) return testInput;
    const activeSteps = traceSteps.filter((s) => s.enabled);
    if (activeSteps.length === 0) return testInput;
    return activeSteps[activeSteps.length - 1].output;
  }, [testInput, traceSteps]);

  const pipelineSkipStep = useMemo(
    () => traceSteps.find((s) => s.skipped),
    [traceSteps],
  );

  const recordSkippedByPipeline = Boolean(pipelineSkipStep);

  // Step 2 -> Empty & Fallback evaluation
  const isPostEmpty =
    !recordSkippedByPipeline &&
    (postTransformValue === null ||
      postTransformValue === undefined ||
      String(postTransformValue).trim() === '');

  let finalPayloadValue = postTransformValue;
  let fallbackApplied = false;
  let emptySkipped = false;

  if (isPostEmpty) {
    if (onEmpty === 'default') {
      finalPayloadValue = defaultValue || '(empty default)';
      fallbackApplied = true;
    } else if (onEmpty === 'skip_record') {
      emptySkipped = true;
    }
  }

  // Step 3 -> Row-Level Skip Filter check
  const recordSkippedByFilter = useMemo(() => {
    if (!hasSkipRule || !skipOperator) return false;
    return evaluateSkipCondition(testInput, skipOperator, skipValue ?? '');
  }, [hasSkipRule, testInput, skipOperator, skipValue]);

  const recordWillBeSkipped =
    recordSkippedByPipeline || emptySkipped || recordSkippedByFilter;

  const sourceName = sourceFieldDef?.label || sourceKey;
  const destName = destFieldDef?.label || destKey;

  return (
    <aside
      className={cn(
        'bg-background flex flex-col border-l border-border/80 min-h-0',
        className,
      )}
      aria-label="Live pipeline effect preview"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg flex items-center justify-center shrink-0 border-0 bg-primary/10 text-primary shadow-2xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Live Pipeline Effect
            </h4>
          </div>
        </div>
        <Badge className="border-0 bg-muted text-muted-foreground text-[10px] font-mono font-medium">
          Read-Only Trace
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4 sm:p-5">
        <div className="space-y-4 text-xs">
          {/* 1. Test Input Box */}
          <div className="bg-card rounded-xl border border-border/70 p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rail-test-input"
                className="text-[11px] font-semibold text-foreground flex items-center gap-1.5"
              >
                <span>Sample Source Value</span>
                {sourceSample && (
                  <Badge className="border-0 bg-primary/15 text-primary text-[9px] px-1.5 py-0 font-medium">
                    Live
                  </Badge>
                )}
              </label>
              {sourceSample && testInput !== sourceSample && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setTestInput(sourceSample)}
                  title="Reset to live sample record value"
                >
                  <RotateCcw className="size-3" />
                </Button>
              )}
            </div>
            <Input
              id="rail-test-input"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type test value..."
              className="h-8 text-xs font-mono bg-background"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Test how this sample transforms and behaves under your settings.
            </p>
          </div>

          {/* 2. Sequential Pipeline Trace */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Sequential Transformation Steps:
              </span>
              <Badge className="border-0 bg-secondary text-secondary-foreground text-[10px] font-mono font-normal">
                {traceSteps.filter((s) => s.enabled).length} active rule
                {traceSteps.filter((s) => s.enabled).length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {traceSteps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-3.5 text-center text-muted-foreground text-[11px] bg-card/40">
                No transformation rules added. Value passes directly.
              </div>
            ) : (
              <div className="space-y-1.5">
                {traceSteps.map((step) => (
                  <div
                    key={`${step.index}-${step.label}`}
                    className={cn(
                      'rounded-xl border px-3 py-2 transition-colors',
                      step.skipped
                        ? 'bg-destructive/10 border-destructive/30'
                        : step.enabled
                          ? 'bg-card border-border/70 shadow-2xs'
                          : 'bg-muted/30 border-border/40 opacity-60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'flex size-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                            step.skipped
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-info/10 text-info',
                          )}
                        >
                          {step.index + 1}
                        </span>
                        <span className="truncate font-semibold text-[11px] text-foreground">
                          {step.label}
                        </span>
                      </div>
                      {!step.enabled ? (
                        <Badge className="border-0 bg-muted text-muted-foreground text-[9px] px-1.5 py-0 font-normal">
                          Disabled
                        </Badge>
                      ) : step.skipped ? (
                        <Badge className="border-0 bg-destructive/15 text-destructive text-[9px] px-1.5 py-0 font-medium">
                          Triggered Skip
                        </Badge>
                      ) : step.bypassed ? (
                        <Badge className="border-0 bg-muted/60 text-muted-foreground text-[9px] px-1.5 py-0 font-normal">
                          Bypassed
                        </Badge>
                      ) : null}
                    </div>
                    {step.enabled && (
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" />
                        {step.skipped ? (
                          <span className="text-destructive font-semibold text-[11px] truncate">
                            🛑 Skip Record (Condition met: {step.skipReason || 'empty'})
                          </span>
                        ) : step.bypassed ? (
                          <span className="text-muted-foreground italic text-[10px]">
                            (Bypassed — record already skipped)
                          </span>
                        ) : (
                          <span className="truncate font-semibold text-foreground">
                            "{step.output}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Empty Fallback Verification */}
          <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-foreground">
                Empty Value Fallback:
              </span>
              <Badge
                className={cn(
                  'border-0 text-[10px] font-medium',
                  onEmpty === 'default'
                    ? 'bg-success/15 text-success'
                    : onEmpty === 'skip_record'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {onEmpty === 'default'
                  ? 'Use Default'
                  : onEmpty === 'skip_record'
                    ? 'Skip Record'
                    : 'Pass Blank'}
              </Badge>
            </div>
            {isPostEmpty ? (
              fallbackApplied ? (
                <p className="text-[11px] text-success font-medium">
                  Value is blank. Fallback applied: <strong>"{defaultValue}"</strong>
                </p>
              ) : emptySkipped ? (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  Source is blank: Record will be skipped!
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Source is blank: Writing null/empty to destination.
                </p>
              )
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Value is present ("{postTransformValue}"). Fallback bypassed.
              </p>
            )}
          </div>

          {/* 4. Skip Filter Status */}
          {hasSkipRule && (
            <div
              className={cn(
                'rounded-xl border p-3 space-y-1.5 shadow-2xs',
                recordSkippedByFilter
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-success/30 bg-success/5',
              )}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold flex items-center gap-1 text-foreground">
                  <Filter className="size-3 text-info" /> Skip Condition:
                </span>
                <Badge
                  className={cn(
                    'border-0 text-[10px] font-medium',
                    recordSkippedByFilter
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-success/15 text-success',
                  )}
                >
                  {recordSkippedByFilter ? 'Triggered (Skip)' : 'Passes Filter'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Condition: {sourceName} {skipOperator}{' '}
                {skipOperator && ['is_empty', 'is_not_empty'].includes(skipOperator)
                  ? ''
                  : `"${skipValue}"`}
              </p>
            </div>
          )}

          {/* 5. Final Outcome Card */}
          <div
            className={cn(
              'rounded-xl border p-3.5 space-y-2 shadow-2xs',
              recordWillBeSkipped
                ? 'border-destructive/30 bg-destructive/10'
                : 'border-success/30 bg-success/5',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                Final Result
              </span>
              {recordWillBeSkipped ? (
                <Badge className="border-0 bg-destructive/20 text-destructive text-[10px] font-semibold">
                  Record Discarded
                </Badge>
              ) : (
                <Badge className="border-0 bg-success/20 text-success text-[10px] font-semibold">
                  Ready to Sync
                </Badge>
              )}
            </div>

            {recordWillBeSkipped ? (
              <div className="space-y-1 text-[11px] text-destructive">
                <p className="font-medium flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  This record will not sync.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {recordSkippedByPipeline
                    ? `Reason: Rule "${pipelineSkipStep?.label || 'Skip rule'}" triggered a record skip.`
                    : emptySkipped
                      ? 'Reason: Empty source field configured to skip record.'
                      : 'Reason: Value matches the row skip filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Destination: <strong>{destName}</strong></span>
                  <span className="text-[10px]">
                    {updatePolicy === 'create_only' ? 'Create-Only' : 'Always Overwrite'}
                  </span>
                </div>
                <div className="bg-card rounded-xl border border-border/80 px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground break-all shadow-2xs">
                  {finalPayloadValue || <span className="text-muted-foreground">(empty)</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
