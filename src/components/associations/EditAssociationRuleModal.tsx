import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  associationsApi,
  type AssociationCondition,
  type AssociationRule,
} from '@/api/associations';
import AssociationConditionsEditor, {
  validateConditions,
} from '@/components/associations/AssociationConditionsEditor';
import FormDialog from '@/components/form/FormDialog';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface ObjectField {
  field: string;
  isArray: boolean;
}

export default function EditAssociationRuleModal({
  projectId,
  rule,
  onSaved,
  onClose,
}: {
  projectId: string;
  rule: AssociationRule;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule.name ?? '');
  const [conditions, setConditions] = useState<AssociationCondition[]>(
    rule.conditions ?? [],
  );
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>(
    rule.conditionLogic ?? 'AND',
  );
  const [sourceFields, setSourceFields] = useState<ObjectField[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    associationsApi
      .getObjectFields(projectId, rule.sourceObject)
      .then((f: unknown) =>
        setSourceFields(
          Array.isArray(f)
            ? (f as Array<string | ObjectField>).map((x) =>
                typeof x === 'string'
                  ? { field: x, isArray: false }
                  : (x as ObjectField),
              )
            : [],
        ),
      )
      .catch(() => setSourceFields([]));
  }, [projectId, rule.sourceObject]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const condErr = validateConditions(conditions);
    if (!trimmedName) {
      setNameError('Name is required');
      return;
    }
    if (condErr) {
      toast.error(condErr);
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      await associationsApi.updateRule(projectId, rule.id, {
        name: trimmedName,
        conditions,
        conditionLogic,
      });
      toast.success('Association rule saved');
      onSaved();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit Association Rule"
      size="lg"
      isDirty
      footer={(requestClose) => (
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Spinner /> : <Check />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <FieldGroup>
          <Field data-invalid={!!nameError}>
            <FieldLabel htmlFor="edit-rule-name" required>
              Rule Name
            </FieldLabel>
            <Input
              id="edit-rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {nameError && (
              <p className="text-destructive text-xs">{nameError}</p>
            )}
          </Field>

          <div className="bg-muted/40 text-muted-foreground rounded-lg border px-3 py-2 font-mono text-xs">
            {rule.sourceObject}.<strong>{rule.sourceMatchField}</strong>
            {' = '}
            {rule.targetObject}.<strong>{rule.targetMatchField}</strong>
            <span className="ml-2 opacity-60">(fixed after creation)</span>
          </div>
        </FieldGroup>

        <AssociationConditionsEditor
          fields={sourceFields}
          conditions={conditions}
          conditionLogic={conditionLogic}
          onChange={(next, logic) => {
            setConditions(next);
            setConditionLogic(logic);
          }}
        />
      </div>
    </FormDialog>
  );
}
