import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { associationsApi } from '@/api/associations';
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
  name?: string;
  hsAssociationTypeId?: string;
}

const STEPS = ['Source Object', 'Target Object', 'Association Type'];

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
  const [errors, setErrors] = useState<FormErrors>({});

  // Dirty once the user has advanced past step 0 or filled in any field —
  // drives the "Discard changes?" confirmation on close (3-step wizard).
  const isDirty =
    step > 0 ||
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
    }
    if (step === 1) {
      if (!form.targetObject) errs.targetObject = 'Select target object';
      if (!form.targetMatchField)
        errs.targetMatchField = 'Select target match field';
      if (form.sourceObject === form.targetObject)
        errs.targetObject = 'Source and target must be different objects';
    }
    if (step === 2) {
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
      });
      toast.success('Association rule created');
      onCreated();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New Association Rule"
      size="lg"
      isDirty={isDirty}
      currentStep={step + 1}
      totalSteps={3}
      stepLabels={STEPS}
      footer={(requestClose) => (
        <div className="flex w-full items-center justify-between">
          <Button
            variant="outline"
            onClick={step === 0 ? requestClose : () => setStep((s) => s - 1)}
            disabled={saving}
          >
            {step === 0 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft /> Back
              </>
            )}
          </Button>
          {step < 2 ? (
            <Button onClick={handleNext} disabled={projectObjects.length === 0}>
              Next <ArrowRight />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.hsAssociationTypeId}
            >
              {saving ? <Spinner /> : <Check />}
              {saving ? 'Creating…' : 'Create Rule'}
            </Button>
          )}
        </div>
      )}
    >
      <div className="space-y-4">
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
              <FieldGroup>
                <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
                  The{' '}
                  <strong className="text-foreground font-semibold">
                    source
                  </strong>{' '}
                  is the object that <em>holds the foreign key value</em>.
                  <br />
                  Example: <code className="text-primary">Customer</code> has
                  field <code className="text-primary">customer_id = 1001</code>
                </div>

                <Field data-invalid={!!errors.sourceObject}>
                  <FieldLabel required>Source Object</FieldLabel>
                  <Select
                    value={form.sourceObject}
                    onValueChange={(v) => {
                      const obj = projectObjects.find(
                        (o) => o.sourceObject === v,
                      );
                      setForm((f) => ({
                        ...f,
                        sourceObject: v,
                        hsSourceObjectType: obj?.hsObjectType ?? '',
                        sourceMatchField: '',
                      }));
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
                        <SelectItem key={o.sourceObject} value={o.sourceObject}>
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
                    <FieldLabel>
                      Source Match Field
                      <span className="text-destructive -ml-1.5">*</span>{' '}
                      <span className="text-muted-foreground font-normal">
                        (the field whose value links to the target)
                      </span>
                    </FieldLabel>
                    {sourceFields.length > 0 ? (
                      <>
                        <Select
                          value={form.sourceMatchField}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, sourceMatchField: v }))
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
                              Array field — one association will be created per
                              element in this array.
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

                {form.sourceObject && form.sourceMatchField && (
                  <div className="bg-primary/5 border-primary/20 text-primary rounded-lg border px-3 py-2 font-mono text-xs">
                    {form.sourceObject}.<strong>{form.sourceMatchField}</strong>{' '}
                    = ?
                  </div>
                )}
              </FieldGroup>
            )}

            {step === 1 && (
              <FieldGroup>
                <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
                  The{' '}
                  <strong className="text-foreground font-semibold">
                    target
                  </strong>{' '}
                  is the object that <em>is referenced by</em> the source field.
                  <br />
                  Example: <code className="text-primary">Job</code> has field{' '}
                  <code className="text-primary">customer_id = 1001</code> —{' '}
                  <em>same value links them</em>
                </div>

                <Field data-invalid={!!errors.targetObject}>
                  <FieldLabel required>Target Object</FieldLabel>
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
                        .filter((o) => o.sourceObject !== form.sourceObject)
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
                    <FieldLabel>
                      Target Match Field
                      <span className="text-destructive -ml-1.5">*</span>{' '}
                      <span className="text-muted-foreground font-normal">
                        (the field whose value equals the source field value)
                      </span>
                    </FieldLabel>
                    {targetFields.length > 0 ? (
                      <Select
                        value={form.targetMatchField}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, targetMatchField: v }))
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

                {form.sourceObject &&
                  form.targetObject &&
                  form.sourceMatchField &&
                  form.targetMatchField && (
                    <div className="bg-primary/5 border-primary/30 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs">
                      <span>
                        {form.sourceObject}.
                        <strong>{form.sourceMatchField}</strong>
                      </span>
                      <span className="text-muted-foreground">=</span>
                      <span>
                        {form.targetObject}.
                        <strong>{form.targetMatchField}</strong>
                      </span>
                      <ArrowRight className="text-muted-foreground ml-auto size-3" />
                      <span className="text-muted-foreground flex items-center gap-1">
                        {form.hsSourceObjectType}{' '}
                        <ArrowLeftRight className="size-3" />{' '}
                        {form.hsTargetObjectType}
                      </span>
                    </div>
                  )}

                <Field>
                  <FieldLabel>Cardinality</FieldLabel>
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
                      <SelectItem value="one_to_one">One-to-One</SelectItem>
                      <SelectItem value="one_to_many">One-to-Many</SelectItem>
                      <SelectItem value="many_to_many">Many-to-Many</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            )}

            {step === 2 && (
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="rule-name" required>
                    Rule Name
                  </FieldLabel>
                  <Input
                    id="rule-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder={`${form.sourceObject} ↔ ${form.targetObject}`}
                  />
                  {errors.name && (
                    <p className="text-destructive text-xs">{errors.name}</p>
                  )}
                </Field>

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
                      . This association type may need to be defined in HubSpot
                      first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Field>
                    <FieldLabel required>HubSpot Association Type</FieldLabel>
                    <div className="max-h-52 space-y-2 overflow-y-auto">
                      {associationTypes.map((t) => {
                        const isSelected =
                          String(form.hsAssociationTypeId) === String(t.typeId);
                        return (
                          <button
                            key={t.typeId}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                hsAssociationTypeId: String(t.typeId),
                                hsAssociationCategory: t.category,
                                hsAssociationLabel: t.label,
                              }))
                            }
                            className={cn(
                              'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted',
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
              </FieldGroup>
            )}
          </>
        )}
      </div>
    </FormDialog>
  );
}
