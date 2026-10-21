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
  isValidationRule,
  passesRuleValidation,
  previewSourceValue,
  RULE_DEFINITIONS,
  type Rule,
} from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';
import type { ConditionOperator, ExcludeCondition } from '@/types/conditions';
import type {
  FieldDef,
  MappingUpdatePolicy,
  OnEmptyPolicy,
} from './FieldMappingCanvas';

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
  sourceType = 'string',
): Array<{
  index: number;
  label: string;
  output: string;
  enabled: boolean;
  failed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  bypassed?: boolean;
  validation?: boolean;
}> {
  let current = input;
  let typedCurrent = previewSourceValue(input, sourceType);
  let failed = false;
  let pipelineSkipped = false;

  return rules.map((rule, index) => {
    const enabled = rule.enabled !== false;
    let stepSkipped = false;
    let stepSkipReason = '';
    let validation: boolean | undefined;

    if (enabled && !failed && !pipelineSkipped) {
      try {
        if (isValidationRule(rule.type)) {
          validation = passesRuleValidation(typedCurrent, rule);
          if (!validation) {
            pipelineSkipped = true;
            stepSkipped = true;
            stepSkipReason = 'validation';
          }
        } else {
          current = String(executeRulePipeline(current, [rule]));
          typedCurrent = current;
          if (current.startsWith('__SKIPPED__:')) {
            pipelineSkipped = true;
            stepSkipped = true;
            stepSkipReason = current.replace('__SKIPPED__:', '');
          }
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
      validation,
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
    () => buildStepTrace(testInput, rules, sourceFieldDef?.type),
    [testInput, rules, sourceFieldDef?.type],
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

  const fieldSkippedByValidation = pipelineSkipStep?.validation === false;
  const recordSkippedByPipeline = Boolean(
    pipelineSkipStep && !fieldSkippedByValidation,
  );

  // Step 2 -> Empty & Fallback evaluation
  const isPostEmpty =
    !recordSkippedByPipeline &&
    !fieldSkippedByValidation &&
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
        'bg-background border-border/80 flex min-h-0 flex-col border-l',
        className,
      )}
      aria-label="Live pipeline effect preview"
    >
      <div className="border-border/60 bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg border-0 shadow-2xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-foreground text-xs font-semibold tracking-wider uppercase">
              Live Pipeline Effect
            </h4>
          </div>
        </div>
        <Badge className="bg-muted text-muted-foreground border-0 font-mono text-[10px] font-medium">
          Read-Only Trace
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-4 sm:p-5">
        <div className="space-y-4 text-xs">
          {/* 1. Test Input Box */}
          <div className="bg-card border-border/70 space-y-2 rounded-xl border p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rail-test-input"
                className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold"
              >
                <span>Sample Source Value</span>
                {sourceSample && (
                  <Badge className="bg-primary/15 text-primary border-0 px-1.5 py-0 text-[9px] font-medium">
                    Live
                  </Badge>
                )}
              </label>
              {sourceSample && testInput !== sourceSample && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground size-5 cursor-pointer"
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
              className="bg-background h-8 font-mono text-xs"
            />
            <p className="text-muted-foreground text-[10px] leading-tight">
              Test how this sample transforms and behaves under your settings.
            </p>
          </div>

          {/* 2. Sequential Pipeline Trace */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Sequential Transformation Steps:
              </span>
              <Badge className="bg-secondary text-secondary-foreground border-0 font-mono text-[10px] font-normal">
                {traceSteps.filter((s) => s.enabled).length} active rule
                {traceSteps.filter((s) => s.enabled).length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {traceSteps.length === 0 ? (
              <div className="border-border/70 text-muted-foreground bg-card/40 rounded-xl border border-dashed p-3.5 text-center text-[11px]">
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
                      <div className="flex min-w-0 items-center gap-2">
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
                        <span className="text-foreground truncate text-[11px] font-semibold">
                          {step.label}
                        </span>
                      </div>
                      {!step.enabled ? (
                        <Badge className="bg-muted text-muted-foreground border-0 px-1.5 py-0 text-[9px] font-normal">
                          Disabled
                        </Badge>
                      ) : step.validation !== undefined ? (
                        <Badge
                          className={cn(
                            'border-0 px-1.5 py-0 text-[9px] font-medium',
                            step.validation
                              ? 'bg-success/15 text-success'
                              : 'bg-destructive/15 text-destructive',
                          )}
                        >
                          {step.validation ? 'True · Continue' : 'False · Stop'}
                        </Badge>
                      ) : step.skipped ? (
                        <Badge className="bg-destructive/15 text-destructive border-0 px-1.5 py-0 text-[9px] font-medium">
                          Triggered Skip
                        </Badge>
                      ) : step.bypassed ? (
                        <Badge className="bg-muted/60 text-muted-foreground border-0 px-1.5 py-0 text-[9px] font-normal">
                          Bypassed
                        </Badge>
                      ) : null}
                    </div>
                    {step.enabled && (
                      <div className="text-muted-foreground mt-1 flex items-center gap-1.5 font-mono text-[11px]">
                        <ArrowRight className="text-muted-foreground/60 size-3 shrink-0" />
                        {step.validation === false ? (
                          <span className="text-destructive text-[11px] font-semibold">
                            Field omitted; remaining rules stopped
                          </span>
                        ) : step.validation === true ? (
                          <span className="text-success text-[11px] font-semibold">
                            True; continue with "{step.output}"
                          </span>
                        ) : step.skipped ? (
                          <span className="text-destructive truncate text-[11px] font-semibold">
                            🛑 Skip Record (Condition met:{' '}
                            {step.skipReason || 'empty'})
                          </span>
                        ) : step.bypassed ? (
                          <span className="text-muted-foreground text-[10px] italic">
                            (Not run — pipeline already stopped)
                          </span>
                        ) : (
                          <span className="text-foreground truncate font-semibold">
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
          <div className="border-border/70 bg-card space-y-1.5 rounded-xl border p-3 shadow-2xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-foreground font-semibold">
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
            {fieldSkippedByValidation ? (
              <p className="text-destructive text-[11px] font-medium">
                Validation failed. This field will be omitted.
              </p>
            ) : isPostEmpty ? (
              fallbackApplied ? (
                <p className="text-success text-[11px] font-medium">
                  Value is blank. Fallback applied:{' '}
                  <strong>"{defaultValue}"</strong>
                </p>
              ) : emptySkipped ? (
                <p className="text-destructive flex items-center gap-1 text-[11px] font-medium">
                  <AlertTriangle className="size-3 shrink-0" />
                  Source is blank: Record will be skipped!
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Source is blank: Writing null/empty to destination.
                </p>
              )
            ) : (
              <p className="text-muted-foreground text-[11px]">
                Value is present ("{postTransformValue}"). Fallback bypassed.
              </p>
            )}
          </div>

          {/* 4. Skip Filter Status */}
          {hasSkipRule && (
            <div
              className={cn(
                'space-y-1.5 rounded-xl border p-3 shadow-2xs',
                recordSkippedByFilter
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-success/30 bg-success/5',
              )}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground flex items-center gap-1 font-semibold">
                  <Filter className="text-info size-3" /> Skip Condition:
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
              <p className="text-muted-foreground text-[11px]">
                Condition: {sourceName} {skipOperator}{' '}
                {skipOperator &&
                ['is_empty', 'is_not_empty'].includes(skipOperator)
                  ? ''
                  : `"${skipValue}"`}
              </p>
            </div>
          )}

          {/* 5. Final Outcome Card */}
          <div
            className={cn(
              'space-y-2 rounded-xl border p-3.5 shadow-2xs',
              recordWillBeSkipped || fieldSkippedByValidation
                ? 'border-destructive/30 bg-destructive/10'
                : 'border-success/30 bg-success/5',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
                Final Result
              </span>
              {fieldSkippedByValidation && !recordWillBeSkipped ? (
                <Badge className="bg-destructive/20 text-destructive border-0 text-[10px] font-semibold">
                  Field Omitted
                </Badge>
              ) : recordWillBeSkipped ? (
                <Badge className="bg-destructive/20 text-destructive border-0 text-[10px] font-semibold">
                  Record Discarded
                </Badge>
              ) : (
                <Badge className="bg-success/20 text-success border-0 text-[10px] font-semibold">
                  Ready to Sync
                </Badge>
              )}
            </div>

            {fieldSkippedByValidation && !recordWillBeSkipped ? (
              <p className="text-destructive text-[11px]">
                The validation failed for {destName}. Other fields can still
                sync.
              </p>
            ) : recordWillBeSkipped ? (
              <div className="text-destructive space-y-1 text-[11px]">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  This record will not sync.
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {recordSkippedByPipeline
                    ? `Reason: Rule "${pipelineSkipStep?.label || 'Skip rule'}" triggered a record skip.`
                    : emptySkipped
                      ? 'Reason: Empty source field configured to skip record.'
                      : 'Reason: Value matches the row skip filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div className="text-muted-foreground flex items-center justify-between">
                  <span>
                    Destination: <strong>{destName}</strong>
                  </span>
                  <span className="text-[10px]">
                    {updatePolicy === 'create_only'
                      ? 'Create-Only'
                      : 'Always Overwrite'}
                  </span>
                </div>
                <div className="bg-card border-border/80 text-foreground rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold break-all shadow-2xs">
                  {finalPayloadValue || (
                    <span className="text-muted-foreground">(empty)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
