import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  CircleHelp,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { associationsApi, type AssociationCondition } from '@/api/associations';
import AssociationConditionsEditor, {
  validateConditions,
} from '@/components/associations/AssociationConditionsEditor';
import FormDialog from '@/components/form/FormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProjectObject {
  sourceObject: string;
  hsObjectType: string;
}

interface ObjectField {
  field: string;
  isArray: boolean;
}

interface AssociationType {
  typeId: number | string;
  category: string;
  label: string;
}

interface CreateAssociationRuleModalProps {
  projectId: string;
  onCreated: () => void;
  onClose: () => void;
}

interface FormErrors {
  sourceObject?: string;
  sourceMatchField?: string;
  targetObject?: string;
  targetMatchField?: string;
  conditions?: string;
  name?: string;
  hsAssociationTypeId?: string;
}

const STEPS = ['Match records', 'Rule details'];

function HelpTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-full"
            aria-label={label}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function CreateAssociationRuleModal({
  projectId,
  onCreated,
  onClose,
}: CreateAssociationRuleModalProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [projectObjects, setProjectObjects] = useState<ProjectObject[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(true);

  const [sourceFields, setSourceFields] = useState<ObjectField[]>([]);
  const [targetFields, setTargetFields] = useState<ObjectField[]>([]);
  const [associationTypes, setAssociationTypes] = useState<AssociationType[]>(
    [],
  );

  const [form, setForm] = useState({
    name: '',
    sourceObject: '',
    sourceMatchField: '',
    hsSourceObjectType: '',
    targetObject: '',
    targetMatchField: '',
    hsTargetObjectType: '',
    hsAssociationTypeId: '',
    hsAssociationCategory: 'HUBSPOT_DEFINED',
    hsAssociationLabel: '',
    cardinality: 'many_to_many',
  });
  const [conditions, setConditions] = useState<AssociationCondition[]>([]);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dirty once the user has advanced past step 0 or filled in any field —
  // drives the "Discard changes?" confirmation on close.
  const isDirty =
    step > 0 ||
    conditions.length > 0 ||
    conditionLogic !== 'AND' ||
    Object.values(form).some(
      (v) => v !== '' && v !== 'many_to_many' && v !== 'HUBSPOT_DEFINED',
    );

  useEffect(() => {
    associationsApi
      .getProjectObjects(projectId)
      .then((data: unknown) => setProjectObjects(data as ProjectObject[]))
      .catch(() => setProjectObjects([]))
      .finally(() => setLoadingObjects(false));
  }, [projectId]);

  useEffect(() => {
    if (!form.sourceObject) return;
    associationsApi
      .getObjectFields(projectId, form.sourceObject)
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
  }, [form.sourceObject, projectId]);

  useEffect(() => {
    if (!form.targetObject) return;
    associationsApi
      .getObjectFields(projectId, form.targetObject)
      .then((f: unknown) =>
        setTargetFields(
          Array.isArray(f)
            ? (f as Array<string | ObjectField>).map((x) =>
                typeof x === 'string'
                  ? { field: x, isArray: false }
                  : (x as ObjectField),
              )
            : [],
        ),
      )
      .catch(() => setTargetFields([]));
  }, [form.targetObject, projectId]);

  useEffect(() => {
    if (!form.hsSourceObjectType || !form.hsTargetObjectType) return;
    const autoName = `${form.sourceObject} ↔ ${form.targetObject}`;
    if (!form.name) setForm((f) => ({ ...f, name: autoName }));
    setLoadingTypes(true);
    associationsApi
      .getAssociationTypes(
        projectId,
        form.hsSourceObjectType,
        form.hsTargetObjectType,
      )
      .then((data: unknown) => setAssociationTypes(data as AssociationType[]))
      .catch(() => setAssociationTypes([]))
      .finally(() => setLoadingTypes(false));
  }, [form.hsSourceObjectType, form.hsTargetObjectType]);

  const validate = () => {
    const errs: FormErrors = {};
    if (step === 0) {
      if (!form.sourceObject) errs.sourceObject = 'Select source object';
      if (!form.sourceMatchField)
        errs.sourceMatchField = 'Select source match field';
      if (!form.targetObject) errs.targetObject = 'Select target object';
      if (!form.targetMatchField)
        errs.targetMatchField = 'Select target match field';
      if (form.sourceObject === form.targetObject)
        errs.targetObject = 'Source and target must be different objects';
    }
    if (step === 1) {
      const condErr = validateConditions(conditions);
      if (condErr) errs.conditions = condErr;
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!form.hsAssociationTypeId)
        errs.hsAssociationTypeId = 'Select an association type';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const selectedType = associationTypes.find(
        (t) => String(t.typeId) === String(form.hsAssociationTypeId),
      );
      await associationsApi.createRule(projectId, {
        name: form.name.trim(),
        sourceObject: form.sourceObject,
        sourceMatchField: form.sourceMatchField,
        destSourceObjectType: form.hsSourceObjectType,
        targetObject: form.targetObject,
        targetMatchField: form.targetMatchField,
        destTargetObjectType: form.hsTargetObjectType,
        assocTypeId: Number(form.hsAssociationTypeId),
        assocCategory: selectedType?.category ?? 'HUBSPOT_DEFINED',
        assocLabel: selectedType?.label ?? null,
        cardinality: form.cardinality,
        conditions: conditions.length > 0 ? conditions : undefined,
        conditionLogic,
      });
      toast.success('Association rule created');
      onCreated();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message ?? 'Failed to create rule';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New association rule"
      size="lg"
      isDirty={isDirty}
      currentStep={step + 1}
      totalSteps={STEPS.length}
      stepLabels={STEPS}
      footer={(requestClose) => (
        <>
          <Button
            variant="outline"
            onClick={step === 0 ? requestClose : () => setStep((s) => s - 1)}
            disabled={saving}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={projectObjects.length === 0}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.hsAssociationTypeId}
            >
              {saving && <Spinner />}
              {saving ? 'Creating…' : 'Create Rule'}
            </Button>
          )}
        </>
      )}
    >
      <div className="space-y-5">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        {loadingObjects ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Spinner /> Loading synced objects…
          </div>
        ) : projectObjects.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              No synced objects found. Run at least one sync job first —
              association rules require data to have been synced.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid overflow-hidden rounded-3xl border lg:grid-cols-2 lg:divide-x">
                  <section className="p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Source record</h3>
                      <HelpTooltip label="About source records">
                        The source carries the reference value used to find the
                        target record.
                      </HelpTooltip>
                    </div>

                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!errors.sourceObject}>
                        <FieldLabel required>Source object</FieldLabel>
                        <Select
                          value={form.sourceObject}
                          onValueChange={(v) => {
                            const obj = projectObjects.find(
                              (o) => o.sourceObject === v,
                            );
                            setForm((f) => {
                              const targetConflicts = f.targetObject === v;
                              return {
                                ...f,
                                sourceObject: v,
                                hsSourceObjectType: obj?.hsObjectType ?? '',
                                sourceMatchField: '',
                                targetObject: targetConflicts
                                  ? ''
                                  : f.targetObject,
                                targetMatchField: targetConflicts
                                  ? ''
                                  : f.targetMatchField,
                                hsTargetObjectType: targetConflicts
                                  ? ''
                                  : f.hsTargetObjectType,
                                hsAssociationTypeId: '',
                                hsAssociationLabel: '',
                              };
                            });
                          }}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-invalid={!!errors.sourceObject}
                          >
                            <SelectValue placeholder="Select object…" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectObjects.map((o) => (
                              <SelectItem
                                key={o.sourceObject}
                                value={o.sourceObject}
                              >
                                {o.sourceObject}{' '}
                                <ArrowRight className="inline size-3" />{' '}
                                {o.hsObjectType} (HubSpot)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.sourceObject && (
                          <p className="text-destructive text-xs">
                            {errors.sourceObject}
                          </p>
                        )}
                      </Field>

                      {form.sourceObject && (
                        <Field data-invalid={!!errors.sourceMatchField}>
                          <FieldLabel required>
                            Source match field
                            <HelpTooltip label="About the source match field">
                              Provides the value used to look up the target.
                            </HelpTooltip>
                          </FieldLabel>
                          {sourceFields.length > 0 ? (
                            <>
                              <Select
                                value={form.sourceMatchField}
                                onValueChange={(v) =>
                                  setForm((f) => ({
                                    ...f,
                                    sourceMatchField: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select field…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sourceFields.map((f) => (
                                    <SelectItem key={f.field} value={f.field}>
                                      {f.field}
                                      {f.isArray ? ' [ ]' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.sourceMatchField &&
                                sourceFields.find(
                                  (f) => f.field === form.sourceMatchField,
                                )?.isArray && (
                                  <p className="text-primary text-xs">
                                    One association will be created for each
                                    value in this array.
                                  </p>
                                )}
                            </>
                          ) : (
                            <Input
                              value={form.sourceMatchField}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  sourceMatchField: e.target.value,
                                }))
                              }
                              placeholder="e.g. customer_id"
                              className="font-mono"
                            />
                          )}
                          {errors.sourceMatchField && (
                            <p className="text-destructive text-xs">
                              {errors.sourceMatchField}
                            </p>
                          )}
                        </Field>
                      )}
                    </FieldGroup>
                  </section>

                  <section className="border-t p-4 lg:border-t-0">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Target record</h3>
                      <HelpTooltip label="About target records">
                        The target is linked when its match field contains the
                        same value as the source.
                      </HelpTooltip>
                    </div>

                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!errors.targetObject}>
                        <FieldLabel required>Target object</FieldLabel>
                        <Select
                          value={form.targetObject}
                          onValueChange={(v) => {
                            const obj = projectObjects.find(
                              (o) => o.sourceObject === v,
                            );
                            setForm((f) => ({
                              ...f,
                              targetObject: v,
                              hsTargetObjectType: obj?.hsObjectType ?? '',
                              targetMatchField: '',
                              hsAssociationTypeId: '',
                              hsAssociationLabel: '',
                            }));
                          }}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-invalid={!!errors.targetObject}
                          >
                            <SelectValue placeholder="Select object…" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectObjects
                              .filter(
                                (o) => o.sourceObject !== form.sourceObject,
                              )
                              .map((o) => (
                                <SelectItem
                                  key={o.sourceObject}
                                  value={o.sourceObject}
                                >
                                  {o.sourceObject}{' '}
                                  <ArrowRight className="inline size-3" />{' '}
                                  {o.hsObjectType} (HubSpot)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {errors.targetObject && (
                          <p className="text-destructive text-xs">
                            {errors.targetObject}
                          </p>
                        )}
                      </Field>

                      {form.targetObject && (
                        <Field data-invalid={!!errors.targetMatchField}>
                          <FieldLabel required>
                            Target match field
                            <HelpTooltip label="About the target match field">
                              Must equal the selected source match field value.
                            </HelpTooltip>
                          </FieldLabel>
                          {targetFields.length > 0 ? (
                            <Select
                              value={form.targetMatchField}
                              onValueChange={(v) =>
                                setForm((f) => ({
                                  ...f,
                                  targetMatchField: v,
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select field…" />
                              </SelectTrigger>
                              <SelectContent>
                                {targetFields.map((f) => (
                                  <SelectItem key={f.field} value={f.field}>
                                    {f.field}
                                    {f.isArray ? ' [ ]' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={form.targetMatchField}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  targetMatchField: e.target.value,
                                }))
                              }
                              placeholder="e.g. customer_id"
                              className="font-mono"
                            />
                          )}
                          {errors.targetMatchField && (
                            <p className="text-destructive text-xs">
                              {errors.targetMatchField}
                            </p>
                          )}
                        </Field>
                      )}
                    </FieldGroup>
                  </section>
                </div>

                {form.sourceObject &&
                  form.targetObject &&
                  form.sourceMatchField &&
                  form.targetMatchField && (
                    <div className="border-primary/25 bg-primary/5 flex flex-wrap items-center justify-center gap-2 rounded-3xl border px-3 py-2 font-mono text-xs">
                      <span className="text-primary">
                        {form.sourceObject}.
                        <strong>{form.sourceMatchField}</strong>
                      </span>
                      <span className="text-muted-foreground">matches</span>
                      <span className="text-primary">
                        {form.targetObject}.
                        <strong>{form.targetMatchField}</strong>
                      </span>
                    </div>
                  )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid overflow-hidden rounded-3xl border lg:grid-cols-2 lg:divide-x">
                  <section className="p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Rule settings</h3>
                    </div>
                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="rule-name" required>
                          Rule name
                        </FieldLabel>
                        <Input
                          id="rule-name"
                          value={form.name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          placeholder={`${form.sourceObject} ↔ ${form.targetObject}`}
                        />
                        {errors.name && (
                          <p className="text-destructive text-xs">
                            {errors.name}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>
                          Cardinality
                          <HelpTooltip label="About association cardinality">
                            Controls whether one or many records may be linked
                            on each side.
                          </HelpTooltip>
                        </FieldLabel>
                        <Select
                          value={form.cardinality}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, cardinality: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_to_one">
                              One-to-One
                            </SelectItem>
                            <SelectItem value="one_to_many">
                              One-to-Many
                            </SelectItem>
                            <SelectItem value="many_to_many">
                              Many-to-Many
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-3xl px-3 py-2 font-mono text-xs">
                        <span>
                          {form.sourceObject}.{form.sourceMatchField}
                        </span>
                        <ArrowLeftRight className="text-muted-foreground size-3.5" />
                        <span>
                          {form.targetObject}.{form.targetMatchField}
                        </span>
                      </div>
                    </FieldGroup>
                  </section>

                  <section className="border-t p-4 lg:border-t-0">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        HubSpot association type
                      </h3>
                      <HelpTooltip label="About HubSpot association types">
                        The relationship label HubSpot applies to this link.
                      </HelpTooltip>
                    </div>
                    {loadingTypes ? (
                      <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                        <Spinner /> Loading association types from HubSpot…
                      </div>
                    ) : associationTypes.length === 0 ? (
                      <Alert variant="destructive">
                        <AlertCircle />
                        <AlertDescription>
                          No association types found for{' '}
                          <strong className="inline-flex items-center gap-1">
                            {form.hsSourceObjectType}{' '}
                            <ArrowRight className="size-3" />{' '}
                            {form.hsTargetObjectType}
                          </strong>
                          . This association type may need to be defined in
                          HubSpot first.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Field data-invalid={!!errors.hsAssociationTypeId}>
                        <FieldLabel required>Association type</FieldLabel>
                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                          {associationTypes.map((t) => {
                            const isSelected =
                              String(form.hsAssociationTypeId) ===
                              String(t.typeId);
                            return (
                              <button
                                key={t.typeId}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    hsAssociationTypeId: String(t.typeId),
                                    hsAssociationCategory: t.category,
                                    hsAssociationLabel: t.label,
                                  }))
                                }
                                className={cn(
                                  'w-full rounded-3xl border px-3 py-2 text-left text-sm transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted',
                                )}
                              >
                                <div className="font-medium">{t.label}</div>
                                <div className="mt-0.5 text-xs opacity-60">
                                  {t.category} · ID {t.typeId}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {errors.hsAssociationTypeId && (
                          <p className="text-destructive text-xs">
                            {errors.hsAssociationTypeId}
                          </p>
                        )}
                      </Field>
                    )}
                  </section>
                </div>

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
            )}
          </>
        )}
      </div>
    </FormDialog>
  );
}
