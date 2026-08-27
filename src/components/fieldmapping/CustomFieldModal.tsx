import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { connectionsApi } from '@/api/connections';
import FormDialog from '@/components/form/FormDialog';
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

const FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'datetime', 'enum'];

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface CustomFieldModalProps {
  side: string;
  onAdd: (field: CustomField) => void;
  onClose: () => void;
  platformId?: string;
  projectId?: string;
  objectType?: string;
}

export default function CustomFieldModal({
  side,
  onAdd,
  onClose,
  platformId,
  projectId,
  objectType,
}: CustomFieldModalProps) {
  const [field, setField] = useState<CustomField>({
    key: '',
    label: '',
    type: 'string',
    required: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isHubSpotDest = side === 'Destination' && platformId === 'hubspot';

  const handle = async () => {
    if (!field.label.trim()) {
      setError('Label is required');
      return;
    }
    const key = field.key.trim()
      ? field.key.trim().replace(/\s+/g, '_').toLowerCase()
      : field.label.trim().replace(/\s+/g, '_').toLowerCase();
    const resolved: CustomField = { ...field, key, label: field.label.trim() };

    if (isHubSpotDest && projectId && objectType) {
      setSaving(true);
      try {
        await connectionsApi.createHubspotProperty(
          projectId,
          objectType,
          resolved as unknown as Record<string, unknown>,
        );
        toast.success(`Property "${resolved.label}" created in HubSpot`);
        onAdd(resolved);
        onClose();
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        const msg =
          e?.response?.data?.message ?? 'Failed to create property in HubSpot';
        setError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    } else {
      onAdd(resolved);
      onClose();
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Add Custom Field"
      description={`${side} Schema${isHubSpotDest ? ' · Creates property in HubSpot' : ''}`}
      size="sm"
      footer={(requestClose) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handle} disabled={saving}>
            {saving ? <Spinner /> : <Plus />}
            {saving
              ? 'Creating…'
              : isHubSpotDest
                ? 'Create in HubSpot'
                : 'Add Field'}
          </Button>
        </>
      )}
    >
      <FieldGroup>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="cf-label" required>
            Display Label
          </FieldLabel>
          <Input
            id="cf-label"
            autoFocus
            value={field.label}
            onChange={(e) => {
              setField((f) => ({ ...f, label: e.target.value }));
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handle()}
            placeholder="e.g. Car Id"
            disabled={saving}
            aria-invalid={!!error}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="cf-key">
            Field Key{' '}
            <span className="text-muted-foreground font-normal">
              (auto-generated if empty)
            </span>
          </FieldLabel>
          <Input
            id="cf-key"
            value={field.key}
            onChange={(e) => setField((f) => ({ ...f, key: e.target.value }))}
            placeholder="e.g. car_id"
            disabled={saving}
            className="font-mono"
          />
        </Field>

        <div className="flex items-end gap-3">
          <Field className="flex-1">
            <FieldLabel>Type</FieldLabel>
            <Select
              value={field.type}
              onValueChange={(v) => setField((f) => ({ ...f, type: v }))}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
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
          </Field>
          <label className="flex h-9 cursor-pointer items-center gap-2">
            <Checkbox
              checked={field.required}
              onCheckedChange={(v) =>
                setField((f) => ({ ...f, required: v === true }))
              }
              disabled={saving}
            />
            <span className="text-muted-foreground text-xs">Required</span>
          </label>
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}
      </FieldGroup>
    </FormDialog>
  );
}
