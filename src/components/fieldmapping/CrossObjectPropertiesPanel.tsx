import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { FieldDef } from './FieldMappingCanvas';

import { connectionsApi } from '@/api/connections';
import {
  jobsApi,
  type CrossObjectProperty,
  type CrossObjectPropertyOption,
} from '@/api/jobs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toCanvasField, type CanvasField } from '@/features/jobs/utils';

export default function CrossObjectPropertiesPanel({
  projectId,
  jobId,
  platformId,
  sourceObject,
  sourceFields,
  properties,
  onPropertiesChange,
}: {
  projectId: string;
  jobId: string;
  platformId: string;
  sourceObject: string;
  sourceFields: FieldDef[];
  properties: CrossObjectProperty[];
  onPropertiesChange: (properties: CrossObjectProperty[]) => void;
}) {
  const [objects, setObjects] = useState<CrossObjectPropertyOption[]>([]);
  const [relatedObject, setRelatedObject] = useState('');
  const [lookupMode, setLookupMode] = useState<'id' | 'name'>('id');
  const [lookupField, setLookupField] = useState('');
  const [importedProperty, setImportedProperty] = useState('');
  const [relatedFields, setRelatedFields] = useState<CanvasField[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    jobsApi
      .getCrossObjectPropertyOptions(projectId, jobId)
      .then((result) => setObjects(result.objects))
      .catch(() => setObjects([]));
  }, [projectId, jobId]);

  useEffect(() => {
    if (!relatedObject) {
      setRelatedFields([]);
      return;
    }
    connectionsApi
      .getProperties(projectId, platformId, relatedObject)
      .then((fields) => setRelatedFields(fields.map(toCanvasField)))
      .catch(() => setRelatedFields([]));
  }, [platformId, projectId, relatedObject]);

  const selectedObject = objects.find(
    (object) => object.objectType === relatedObject,
  );
  const add = async () => {
    if (!relatedObject || !lookupField || !importedProperty) return;
    setBusy(true);
    try {
      const created = await jobsApi.createCrossObjectProperty(
        projectId,
        jobId,
        { relatedObject, lookupMode, lookupField, importedProperty },
      );
      onPropertiesChange([...properties, created]);
      setImportedProperty('');
      toast.success('Cross-object property added.');
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(
        e.response?.data?.message ?? 'Could not add the cross-object property.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Cross-object properties</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Import a property through an ID or employee-name field on each source
          record. Imported values become forward-only source fields.
        </p>
      </div>
      <div className="grid gap-2 rounded-4xl border p-4 lg:grid-cols-4">
        <Select
          value={relatedObject}
          onValueChange={(value) => {
            setRelatedObject(value);
            setLookupField('');
            setImportedProperty('');
            const object = objects.find(
              (candidate) => candidate.objectType === value,
            );
            setLookupMode(object?.lookupModes[0] ?? 'id');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Related object" />
          </SelectTrigger>
          <SelectContent>
            {objects.map((object) => (
              <SelectItem key={object.objectType} value={object.objectType}>
                {object.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={lookupMode}
          onValueChange={(value) => setLookupMode(value as 'id' | 'name')}
          disabled={!selectedObject}
        >
          <SelectTrigger>
            <SelectValue placeholder="Lookup method" />
          </SelectTrigger>
          <SelectContent>
            {selectedObject?.lookupModes.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode === 'id' ? 'Match by ID' : 'Match employee by name'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lookupField} onValueChange={setLookupField}>
          <SelectTrigger>
            <SelectValue placeholder="Field on current object" />
          </SelectTrigger>
          <SelectContent>
            {sourceFields.map((field) => (
              <SelectItem key={field.key} value={field.key}>
                {field.label ?? field.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={importedProperty}
          onValueChange={setImportedProperty}
          disabled={!relatedObject}
        >
          <SelectTrigger>
            <SelectValue placeholder="Property to import" />
          </SelectTrigger>
          <SelectContent>
            {relatedFields.map((field) => (
              <SelectItem key={field.key} value={field.key}>
                {field.label ?? field.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end lg:col-span-4">
          <Button
            type="button"
            onClick={add}
            disabled={
              busy || !relatedObject || !lookupField || !importedProperty
            }
          >
            {busy ? <Spinner /> : <Plus />} Add property
          </Button>
        </div>
      </div>
      {properties.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-4xl px-4 py-8 text-center text-sm">
          No cross-object properties configured for this {sourceObject} job.
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex items-center justify-between gap-3 rounded-3xl border px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{property.displayLabel}</p>
                <p className="text-muted-foreground text-xs">
                  {property.lookupFieldLabel} ·{' '}
                  {property.lookupMode === 'id'
                    ? 'ID lookup'
                    : 'Employee name lookup'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Forward only</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${property.displayLabel}`}
                  onClick={async () => {
                    try {
                      await jobsApi.deleteCrossObjectProperty(
                        projectId,
                        jobId,
                        property.id,
                      );
                      onPropertiesChange(
                        properties.filter((item) => item.id !== property.id),
                      );
                      toast.success('Cross-object property removed.');
                    } catch (error) {
                      const e = error as {
                        response?: { data?: { message?: string } };
                      };
                      toast.error(
                        e.response?.data?.message ??
                          'Could not remove this property.',
                      );
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
