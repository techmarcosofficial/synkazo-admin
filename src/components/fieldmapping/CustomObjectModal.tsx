import { AlertCircle, Lock, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { connectionsApi } from '@/api/connections';
import FormDialog from '@/components/form/FormDialog';
import FormSection from '@/components/form/FormSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useEntitlements } from '@/queries/useEntitlements';
import type { Connection } from '@/types';

const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'enum',
  'array',
];

const FIELD_TYPE_TONE: Record<string, string> = {
  string: 'bg-success/10 text-success',
  number: 'bg-info/10 text-info',
  boolean: 'bg-paused/10 text-paused',
};

interface CustomObjectField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface CustomObjectModalProps {
  side: string;
  platformId: string;
  projectId: string;
  connection?: Connection & {
    supportsCustomObjects?: boolean;
    providerMetadata?: { supportsCustomObjects?: boolean };
  };
  onAdd: (obj: {
    name: string;
    objectTypeId?: string;
    description?: string;
    fields: CustomObjectField[];
  }) => void;
  onClose: () => void;
}

export default function CustomObjectModal({
  side,
  platformId,
  projectId,
  connection,
  onAdd,
  onClose,
}: CustomObjectModalProps) {
  const [name, setName] = useState('');
  const [singularLabel, setSingularLabel] = useState('');
  const [pluralLabel, setPluralLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<CustomObjectField[]>([
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'name', label: 'Name', type: 'string', required: true },
  ]);
  const [newField, setNewField] = useState<CustomObjectField>({
    key: '',
    label: '',
    type: 'string',
    required: false,
  });
  const [errors, setErrors] = useState<{
    name?: string;
    singularLabel?: string;
    pluralLabel?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const isHubSpot = platformId === 'hubspot';
  const FIXED_SCHEMA_LABELS: Record<string, string> = {
    servicetitan: 'ServiceTitan',
    dataforma: 'Dataforma',
    texada: 'Texada',
  };
  const fixedSchemaLabel = FIXED_SCHEMA_LABELS[platformId] ?? 'this platform';
  // Only a confirmed real failure (see backend createHubspotCustomObject) sets this
  // to `false` — HubSpot has no API to check custom-object eligibility in advance,
  // so `undefined` means "unknown" and should behave like "assume it works," not
  // "assume it's blocked."
  const customObjectsBlocked =
    connection?.supportsCustomObjects === false ||
    connection?.providerMetadata?.supportsCustomObjects === false;
  const supportsCustomObjects = !customObjectsBlocked;
  const planAllowsCustomObjects = useEntitlements().customObjects;

  const addField = () => {
    if (!newField.key.trim() || !newField.label.trim()) return;
    setFields((prev) => [
      ...prev,
      {
        ...newField,
        key: newField.key.trim().replace(/\s+/g, '_').toLowerCase(),
        label: newField.label.trim(),
      },
    ]);
    setNewField({ key: '', label: '', type: 'string', required: false });
  };

  const removeField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));

  const updateFieldKey = (idx: number, value: string) =>
    setFields((prev) =>
      prev.map((f, i) =>
        i === idx ? { ...f, key: value.replace(/\s+/g, '_').toLowerCase() } : f,
      ),
    );

  const updateFieldLabel = (idx: number, value: string) =>
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, label: value } : f)),
    );

  const handleSubmit = async () => {
    const errs: {
      name?: string;
      singularLabel?: string;
      pluralLabel?: string;
    } = {};
    if (!name.trim()) errs.name = 'Object name is required';
    if (isHubSpot && supportsCustomObjects && !singularLabel.trim())
      errs.singularLabel = 'Singular label is required';
    if (isHubSpot && supportsCustomObjects && !pluralLabel.trim())
      errs.pluralLabel = 'Plural label is required';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const pendingFields =
      newField.key.trim() && newField.label.trim()
        ? [
            ...fields,
            {
              ...newField,
              key: newField.key.trim().replace(/\s+/g, '_').toLowerCase(),
              label: newField.label.trim(),
            },
          ]
        : fields;

    if (isHubSpot && supportsCustomObjects) {
      setSaving(true);
      try {
        const result = (await connectionsApi.createHubspotCustomObject(
          projectId,
          {
            name: name.trim().replace(/\s+/g, '_').toLowerCase(),
            singularLabel: singularLabel.trim() || name.trim(),
            pluralLabel: pluralLabel.trim() || `${name.trim()}s`,
            fields: pendingFields,
          },
        )) as { name: string; objectTypeId?: string };
        toast.success(`Custom object "${result.name}" created in HubSpot`);
        onAdd({
          name: result.name,
          objectTypeId: result.objectTypeId,
          fields: pendingFields,
        });
        onClose();
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(
          e?.response?.data?.message ??
            'Failed to create custom object in HubSpot',
        );
      } finally {
        setSaving(false);
      }
    } else {
      onAdd({
        name: name.trim(),
        description: description.trim(),
        fields: pendingFields,
      });
      onClose();
    }
  };

  if (!isHubSpot) {
    return (
      <FormDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`Add Custom ${side} Object`}
        size="lg"
        footer={(requestClose) => (
          <Button variant="outline" onClick={requestClose} className="w-full">
            Close
          </Button>
        )}
      >
        <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4">
          <AlertCircle className="text-warning mt-0.5 size-4.5 shrink-0" />
          <div>
            <p className="mb-1 text-sm font-medium">
              Not supported by {fixedSchemaLabel}
            </p>
            <p className="text-muted-foreground text-xs">
              {fixedSchemaLabel} objects are fixed by the platform. Custom
              objects must be created directly in your {fixedSchemaLabel}{' '}
              account. Once created, they will appear automatically in Synkazo.
            </p>
          </div>
        </div>
      </FormDialog>
    );
  }

  // Plan gate, checked before the connection-level block: custom objects are a paid
  // capability regardless of platform, and the API rejects the create either way.
  if (!planAllowsCustomObjects) {
    return (
      <FormDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`Add Custom ${side} Object`}
        size="lg"
        footer={(requestClose) => (
          <>
            <Button variant="outline" onClick={requestClose}>
              Close
            </Button>
            <Button asChild>
              <a href={`${import.meta.env.VITE_FRONTEND_URL}/pricing`}>
                Upgrade plan
              </a>
            </Button>
          </>
        )}
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="bg-paused/10 flex size-14 items-center justify-center rounded-2xl">
            <Lock className="text-paused size-6" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">
              Custom objects aren't on your plan
            </p>
            <p className="text-muted-foreground text-xs">
              Upgrade to create and sync custom object schemas.
            </p>
          </div>
        </div>
      </FormDialog>
    );
  }

  if (isHubSpot && customObjectsBlocked) {
    return (
      <FormDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`Add Custom ${side} Object`}
        size="lg"
        footer={(requestClose) => (
          <Button variant="outline" onClick={requestClose} className="w-full">
            Close
          </Button>
        )}
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="bg-paused/10 flex size-14 items-center justify-center rounded-2xl">
            <Lock className="text-paused size-6" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">
              Custom objects unavailable
            </p>
            <p className="text-muted-foreground text-xs">
              {connection?.providerMetadata?.customObjectsBlockedReason ??
                'HubSpot rejected the last attempt to create a custom object on this connection.'}
            </p>
          </div>
          <div className="bg-muted/40 text-muted-foreground w-full rounded-xl border p-3 text-xs">
            If you've since upgraded your HubSpot plan, re-test your connection
            in Synkazo to try again.
          </div>
        </div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Add Custom ${side} Object`}
      size="lg"
      footer={(requestClose) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Spinner /> : <Plus />}
            {saving
              ? 'Creating…'
              : isHubSpot
                ? 'Create in HubSpot'
                : 'Add Object'}
          </Button>
        </>
      )}
    >
      <FormSection
        title="Object Definition"
        description={
          isHubSpot
            ? 'Creates a new custom object schema in HubSpot'
            : 'Define a custom object and its fields'
        }
      >
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="obj-name">
              Object Name
              <span className="text-destructive -ml-1.5">*</span>{' '}
              <span className="text-muted-foreground font-normal">
                (no spaces)
              </span>
            </FieldLabel>
            <Input
              id="obj-name"
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/\s+/g, '_').toLowerCase())
              }
              placeholder="e.g. service_requests"
              className="font-mono"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name}</p>
            )}
          </Field>

          {isHubSpot && (
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.singularLabel}>
                <FieldLabel htmlFor="obj-singular" required>
                  Singular Label
                </FieldLabel>
                <Input
                  id="obj-singular"
                  value={singularLabel}
                  onChange={(e) => setSingularLabel(e.target.value)}
                  placeholder="e.g. Service Request"
                  aria-invalid={!!errors.singularLabel}
                />
                {errors.singularLabel && (
                  <p className="text-destructive text-xs">
                    {errors.singularLabel}
                  </p>
                )}
              </Field>
              <Field data-invalid={!!errors.pluralLabel}>
                <FieldLabel htmlFor="obj-plural" required>
                  Plural Label
                </FieldLabel>
                <Input
                  id="obj-plural"
                  value={pluralLabel}
                  onChange={(e) => setPluralLabel(e.target.value)}
                  placeholder="e.g. Service Requests"
                  aria-invalid={!!errors.pluralLabel}
                />
                {errors.pluralLabel && (
                  <p className="text-destructive text-xs">
                    {errors.pluralLabel}
                  </p>
                )}
              </Field>
            </div>
          )}

          {!isHubSpot && (
            <Field>
              <FieldLabel htmlFor="obj-desc">Description</FieldLabel>
              <Input
                id="obj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this object…"
              />
            </Field>
          )}

          <Field>
            <FieldLabel>Object Fields</FieldLabel>
            <div className="overflow-hidden rounded-xl border">
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="bg-muted/40 flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  <Input
                    value={f.key}
                    onChange={(e) => updateFieldKey(i, e.target.value)}
                    className="h-7 flex-1 font-mono text-xs"
                  />
                  <Input
                    value={f.label}
                    onChange={(e) => updateFieldLabel(i, e.target.value)}
                    className="h-7 flex-1 text-xs"
                  />
                  <Badge
                    className={cn(
                      'font-mono',
                      FIELD_TYPE_TONE[f.type] ?? 'bg-warning/10 text-warning',
                    )}
                  >
                    {f.type}
                  </Badge>
                  {f.required && (
                    <span className="text-destructive text-xs">*</span>
                  )}
                  {i > 0 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(i)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              ))}
              <div className="bg-muted/40 space-y-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Input
                    value={newField.key}
                    onChange={(e) =>
                      setNewField((f) => ({ ...f, key: e.target.value }))
                    }
                    placeholder="field_key"
                    className="h-8 flex-1 font-mono text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addField()}
                  />
                  <Input
                    value={newField.label}
                    onChange={(e) =>
                      setNewField((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="Display Label"
                    className="h-8 flex-1 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addField()}
                  />
                  <Select
                    value={newField.type}
                    onValueChange={(v) =>
                      setNewField((f) => ({ ...f, type: v }))
                    }
                  >
                    <SelectTrigger size="sm" className="w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1">
                    <Checkbox
                      checked={newField.required}
                      onCheckedChange={(v) =>
                        setNewField((f) => ({ ...f, required: v === true }))
                      }
                    />
                    <span className="text-muted-foreground text-xs">Req</span>
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-dashed"
                  onClick={addField}
                >
                  <Plus /> Add object field
                </Button>
              </div>
            </div>
          </Field>
        </FieldGroup>
      </FormSection>
    </FormDialog>
  );
}
