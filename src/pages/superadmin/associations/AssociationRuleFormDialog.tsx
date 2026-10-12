import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  SuperAdminAssociationRule,
  SuperAdminCreateAssociationRuleDto,
  SuperAdminUpdateAssociationRuleDto,
} from '@/types';

// GAP-022 — SA-scoped rule editor. Deliberately minimal: SA operators
// need the full CRUD surface without duplicating the tenant's rich
// object/field pickers here, so this dialog captures the identity
// fields explicitly and takes conditions as JSON. Every submit is
// gated on a >=10 char reason (matches the API DTO invariant).

const MIN_REASON = 10;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  rule: SuperAdminAssociationRule | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCreate: (dto: SuperAdminCreateAssociationRuleDto) => void;
  onUpdate: (ruleId: string, dto: SuperAdminUpdateAssociationRuleDto) => void;
}

interface FormState {
  name: string;
  sourceObject: string;
  sourceMatchField: string;
  destSourceObjectType: string;
  targetObject: string;
  targetMatchField: string;
  destTargetObjectType: string;
  assocTypeId: string;
  assocCategory: string;
  assocLabel: string;
  cardinality: string;
  conditionsJson: string;
  conditionLogic: 'AND' | 'OR';
  isEnabled: boolean;
  reason: string;
}

function emptyState(): FormState {
  return {
    name: '',
    sourceObject: '',
    sourceMatchField: '',
    destSourceObjectType: '',
    targetObject: '',
    targetMatchField: '',
    destTargetObjectType: '',
    assocTypeId: '',
    assocCategory: '',
    assocLabel: '',
    cardinality: '',
    conditionsJson: '[]',
    conditionLogic: 'AND',
    isEnabled: true,
    reason: '',
  };
}

function fromRule(rule: SuperAdminAssociationRule): FormState {
  return {
    name: rule.name ?? '',
    sourceObject: rule.sourceObject,
    sourceMatchField: rule.sourceMatchField,
    destSourceObjectType: rule.destSourceObjectType ?? '',
    targetObject: rule.targetObject,
    targetMatchField: rule.targetMatchField,
    destTargetObjectType: rule.destTargetObjectType ?? '',
    assocTypeId: rule.assocTypeId?.toString() ?? '',
    assocCategory: rule.assocCategory ?? '',
    assocLabel: rule.assocLabel ?? '',
    cardinality: rule.cardinality ?? '',
    conditionsJson: JSON.stringify(rule.conditions ?? [], null, 2),
    conditionLogic: (rule.conditionLogic ?? 'AND') as 'AND' | 'OR',
    isEnabled: rule.isEnabled ?? true,
    reason: '',
  };
}

export default function AssociationRuleFormDialog({
  open,
  onOpenChange,
  mode,
  rule,
  isSubmitting,
  errorMessage,
  onCreate,
  onUpdate,
}: Props) {
  const [state, setState] = useState<FormState>(emptyState());
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setJsonError(null);
    setState(mode === 'edit' && rule ? fromRule(rule) : emptyState());
  }, [open, mode, rule]);

  const reasonOk = state.reason.trim().length >= MIN_REASON;

  const requiredFieldsFilledForCreate =
    state.name.trim().length > 0 &&
    state.sourceObject.trim().length > 0 &&
    state.sourceMatchField.trim().length > 0 &&
    state.destSourceObjectType.trim().length > 0 &&
    state.targetObject.trim().length > 0 &&
    state.targetMatchField.trim().length > 0 &&
    state.destTargetObjectType.trim().length > 0 &&
    state.assocTypeId.trim().length > 0 &&
    !Number.isNaN(Number(state.assocTypeId));

  const canSubmit =
    reasonOk &&
    !isSubmitting &&
    (mode === 'edit' || requiredFieldsFilledForCreate) &&
    !jsonError;

  const parseConditions = () => {
    const raw = state.conditionsJson.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Conditions must be a JSON array.');
      return parsed;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Invalid JSON.');
    }
  };

  const submit = () => {
    if (!canSubmit) return;
    let conditions;
    try {
      conditions = parseConditions();
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON.');
      return;
    }

    if (mode === 'create') {
      const dto: SuperAdminCreateAssociationRuleDto = {
        name: state.name.trim(),
        sourceObject: state.sourceObject.trim(),
        sourceMatchField: state.sourceMatchField.trim(),
        destSourceObjectType: state.destSourceObjectType.trim(),
        targetObject: state.targetObject.trim(),
        targetMatchField: state.targetMatchField.trim(),
        destTargetObjectType: state.destTargetObjectType.trim(),
        assocTypeId: Number(state.assocTypeId),
        conditions,
        conditionLogic: state.conditionLogic,
        reason: state.reason.trim(),
      };
      if (state.assocCategory.trim()) dto.assocCategory = state.assocCategory.trim();
      if (state.assocLabel.trim()) dto.assocLabel = state.assocLabel.trim();
      if (state.cardinality.trim()) dto.cardinality = state.cardinality.trim();
      onCreate(dto);
      return;
    }

    if (!rule) return;
    const dto: SuperAdminUpdateAssociationRuleDto = {
      isEnabled: state.isEnabled,
      conditionLogic: state.conditionLogic,
      conditions,
      reason: state.reason.trim(),
    };
    if (state.name.trim()) dto.name = state.name.trim();
    if (state.assocTypeId.trim() && !Number.isNaN(Number(state.assocTypeId))) {
      dto.assocTypeId = Number(state.assocTypeId);
    }
    if (state.assocCategory.trim()) dto.assocCategory = state.assocCategory.trim();
    if (state.assocLabel.trim()) dto.assocLabel = state.assocLabel.trim();
    onUpdate(rule.id, dto);
  };

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'New association rule' : `Edit rule: ${rule?.name ?? rule?.id}`}</DialogTitle>
          <DialogDescription>
            Reason will be recorded on the audit row for this mutation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assoc-name">Rule name</Label>
            <Input
              id="assoc-name"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            />
          </div>

          {isCreate ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-source-object">Source object</Label>
                  <Input
                    id="assoc-source-object"
                    value={state.sourceObject}
                    onChange={(e) =>
                      setState((s) => ({ ...s, sourceObject: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-source-field">Source match field</Label>
                  <Input
                    id="assoc-source-field"
                    value={state.sourceMatchField}
                    onChange={(e) =>
                      setState((s) => ({ ...s, sourceMatchField: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-dest-source-type">Dest. source object type</Label>
                  <Input
                    id="assoc-dest-source-type"
                    value={state.destSourceObjectType}
                    onChange={(e) =>
                      setState((s) => ({ ...s, destSourceObjectType: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-target-object">Target object</Label>
                  <Input
                    id="assoc-target-object"
                    value={state.targetObject}
                    onChange={(e) =>
                      setState((s) => ({ ...s, targetObject: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-target-field">Target match field</Label>
                  <Input
                    id="assoc-target-field"
                    value={state.targetMatchField}
                    onChange={(e) =>
                      setState((s) => ({ ...s, targetMatchField: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assoc-dest-target-type">Dest. target object type</Label>
                  <Input
                    id="assoc-dest-target-type"
                    value={state.destTargetObjectType}
                    onChange={(e) =>
                      setState((s) => ({ ...s, destTargetObjectType: e.target.value }))
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assoc-type-id">Assoc type id</Label>
              <Input
                id="assoc-type-id"
                type="number"
                value={state.assocTypeId}
                onChange={(e) =>
                  setState((s) => ({ ...s, assocTypeId: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assoc-category">Category</Label>
              <Input
                id="assoc-category"
                value={state.assocCategory}
                onChange={(e) =>
                  setState((s) => ({ ...s, assocCategory: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assoc-label">Label</Label>
              <Input
                id="assoc-label"
                value={state.assocLabel}
                onChange={(e) =>
                  setState((s) => ({ ...s, assocLabel: e.target.value }))
                }
              />
            </div>
          </div>

          {isCreate ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assoc-cardinality">Cardinality</Label>
              <Input
                id="assoc-cardinality"
                value={state.cardinality}
                onChange={(e) =>
                  setState((s) => ({ ...s, cardinality: e.target.value }))
                }
                placeholder="e.g. one_to_many"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="assoc-enabled"
                type="checkbox"
                checked={state.isEnabled}
                onChange={(e) =>
                  setState((s) => ({ ...s, isEnabled: e.target.checked }))
                }
                className="size-4"
              />
              <Label htmlFor="assoc-enabled">Enabled</Label>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assoc-condition-logic">Condition logic</Label>
            <select
              id="assoc-condition-logic"
              value={state.conditionLogic}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  conditionLogic: e.target.value as 'AND' | 'OR',
                }))
              }
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="AND">Match All</option>
              <option value="OR">Match Any</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assoc-conditions">Conditions (JSON array)</Label>
            <Textarea
              id="assoc-conditions"
              value={state.conditionsJson}
              onChange={(e) =>
                setState((s) => ({ ...s, conditionsJson: e.target.value }))
              }
              rows={6}
              spellCheck={false}
              className="font-mono text-xs"
            />
            <div className="text-muted-foreground text-xs">
              e.g. <code>[{'{'}"field":"status","operator":"equals","value":"active"{'}'}]</code>
            </div>
            {jsonError ? (
              <div className="text-destructive text-xs">{jsonError}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assoc-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (min {MIN_REASON} characters)
              </span>
            </Label>
            <Textarea
              id="assoc-reason"
              value={state.reason}
              onChange={(e) => setState((s) => ({ ...s, reason: e.target.value }))}
              rows={3}
              aria-invalid={state.reason.length > 0 && !reasonOk}
            />
            <div className="text-muted-foreground text-xs">
              {state.reason.trim().length}/{MIN_REASON} characters
            </div>
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting
              ? 'Saving…'
              : isCreate
                ? 'Create rule'
                : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
