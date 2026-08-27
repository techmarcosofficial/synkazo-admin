import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'enum',
  'array',
];

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface CustomFieldFormProps {
  side: string;
  onAdd: (field: CustomField) => void;
  onClose: () => void;
}

export default function CustomFieldForm({
  side,
  onAdd,
  onClose,
}: CustomFieldFormProps) {
  const [field, setField] = useState<CustomField>({
    key: '',
    label: '',
    type: 'string',
    required: false,
  });
  const [error, setError] = useState('');

  const handle = () => {
    if (!field.key.trim() || !field.label.trim()) {
      setError('Key and Label are required');
      return;
    }
    onAdd({
      ...field,
      key: field.key.trim().replace(/\s+/g, '_').toLowerCase(),
      label: field.label.trim(),
    });
    onClose();
  };

  return (
    <Card className="mt-3 border-dashed">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-primary text-xs font-semibold tracking-wider uppercase">
            Add Custom {side} Field
          </span>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X />
          </Button>
        </div>

        <FieldGroup className="gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel className="text-xs" required>
                Field Key
              </FieldLabel>
              <Input
                value={field.key}
                onChange={(e) =>
                  setField((f) => ({ ...f, key: e.target.value }))
                }
                placeholder="e.g. custom_field_1"
                className="h-8 font-mono text-xs"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs" required>
                Display Label
              </FieldLabel>
              <Input
                value={field.label}
                onChange={(e) =>
                  setField((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Custom Field"
                className="h-8 text-xs"
              />
            </Field>
          </div>

          <div className="flex items-end gap-3">
            <Field className="flex-1">
              <FieldLabel className="text-xs">Type</FieldLabel>
              <Select
                value={field.type}
                onValueChange={(v) => setField((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger size="sm" className="w-full text-xs">
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
            <label className="flex h-8 cursor-pointer items-center gap-1.5">
              <Checkbox
                checked={field.required}
                onCheckedChange={(v) =>
                  setField((f) => ({ ...f, required: v === true }))
                }
              />
              <span className="text-muted-foreground text-xs">Required</span>
            </label>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button
            variant="secondary"
            size="sm"
            onClick={handle}
            className="w-fit"
          >
            <Plus /> Add Field
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
