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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [removing, setRemoving] = useState<CrossObjectProperty | null>(null);

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
      <div className="bg-muted/20 space-y-4 rounded-3xl border p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label id="cross-object-label" className="text-xs font-medium">
              Related object
            </label>
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
              <SelectTrigger
                aria-labelledby="cross-object-label"
                className="w-full"
              >
                <SelectValue placeholder="Select object" />
              </SelectTrigger>
              <SelectContent>
                {objects.map((object) => (
                  <SelectItem key={object.objectType} value={object.objectType}>
                    {object.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label id="cross-mode-label" className="text-xs font-medium">
              Relationship field
            </label>
            <Select
              value={selectedObject ? lookupMode : ''}
              onValueChange={(value) => setLookupMode(value as 'id' | 'name')}
              disabled={!selectedObject}
            >
              <SelectTrigger
                aria-labelledby="cross-mode-label"
                className="w-full"
              >
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {selectedObject?.lookupModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode === 'id'
                      ? relatedObject === 'customer-contacts'
                        ? 'Influencer ID'
                        : 'Related record ID'
                      : 'Employee name'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label id="cross-lookup-label" className="text-xs font-medium">
              Current object field
            </label>
            <Select
              value={lookupField}
              onValueChange={setLookupField}
              disabled={!selectedObject}
            >
              <SelectTrigger
                aria-labelledby="cross-lookup-label"
                className="w-full"
              >
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {sourceFields
                  .filter((field) => !field.key.startsWith('__cross_object__:'))
                  .map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Contains the related{' '}
              {lookupMode === 'name'
                ? 'name'
                : relatedObject === 'customer-contacts'
                  ? 'Influencer ID'
                  : 'record ID'}
              .
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-1.5">
            <label id="cross-property-label" className="text-xs font-medium">
              Property to import
            </label>
            <Select
              value={importedProperty}
              onValueChange={setImportedProperty}
              disabled={!relatedObject || relatedFields.length === 0}
            >
              <SelectTrigger
                aria-labelledby="cross-property-label"
                className="w-full"
              >
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {relatedFields
                  .filter((field) => field.key !== '_discoveryError')
                  .map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={add}
            className="w-full md:w-auto"
            disabled={
              busy ||
              !selectedObject?.lookupModes.includes(lookupMode) ||
              !lookupField ||
              !importedProperty
            }
          >
            {busy ? <Spinner /> : <Plus />} Add property
          </Button>
        </div>
      </div>
      <h4 className="text-xs font-semibold">Imported properties</h4>
      {properties.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-4xl px-4 py-8 text-center text-sm">
          No cross-object properties configured for this {sourceObject} job.
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{property.displayLabel}</p>
                <p className="text-muted-foreground text-xs">
                  {property.relatedObjectLabel} · {property.importedProperty} ·{' '}
                  {property.lookupFieldLabel} ·{' '}
                  {property.lookupMode === 'name'
                    ? 'Employee name lookup'
                    : property.relatedObject === 'customer-contacts'
                      ? 'Influencer ID lookup'
                      : 'ID lookup'}
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
                  onClick={() => setRemoving(property)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove cross-object property?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{removing?.displayLabel}” from imported properties?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removing) return;
                try {
                  await jobsApi.deleteCrossObjectProperty(
                    projectId,
                    jobId,
                    removing.id,
                  );
                  onPropertiesChange(
                    properties.filter((item) => item.id !== removing.id),
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
                } finally {
                  setRemoving(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
