import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { associationsApi, type CompanyOwnerMapping } from '@/api/associations';
import { connectionsApi } from '@/api/connections';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

interface ObjectField {
  field: string;
  isArray: boolean;
}

interface HubspotProperty {
  name: string;
  label: string;
}

/** Config-driven Dataforma "source field -> HubSpot owner property" mapping
 * list. Fully separate from ServiceTitan's CAM name-matching UI — this
 * component is only rendered for Dataforma-sourced projects. */
export default function DataformaOwnerMappingsEditor({
  projectId,
}: {
  projectId: string;
}) {
  const [mappings, setMappings] = useState<CompanyOwnerMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFields, setSourceFields] = useState<ObjectField[]>([]);
  const [hubspotProperties, setHubspotProperties] = useState<HubspotProperty[]>(
    [],
  );

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    associationsApi
      .listCompanyOwnerMappings(projectId)
      .then(setMappings)
      .catch(() => toast.error('Failed to load owner mappings'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  useEffect(() => {
    associationsApi
      .getObjectFields(projectId, 'customers')
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

    connectionsApi
      .getProperties(projectId, 'hubspot', 'companies')
      .then((props) => setHubspotProperties(props.map((p) => ({ name: p.name, label: p.label }))))
      .catch(() => setHubspotProperties([]));
  }, [projectId]);

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraftSource('');
    setDraftTarget('');
  };

  const startEdit = (m: CompanyOwnerMapping) => {
    setEditingId(m.id);
    setAdding(false);
    setDraftSource(m.sourceProperty);
    setDraftTarget(m.targetHubspotProperty);
  };

  const cancelDraft = () => {
    setAdding(false);
    setEditingId(null);
  };

  const duplicateTarget =
    !!draftTarget &&
    mappings.some(
      (m) => m.targetHubspotProperty === draftTarget && m.id !== editingId,
    );

  const saveDraft = async () => {
    if (!draftSource || !draftTarget) {
      toast.error('Select both a source field and a target HubSpot property');
      return;
    }
    if (duplicateTarget) {
      toast.error(
        `"${draftTarget}" is already targeted by another mapping — pick a different property`,
      );
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await associationsApi.updateCompanyOwnerMapping(projectId, editingId, {
          sourceProperty: draftSource,
          targetHubspotProperty: draftTarget,
        });
        toast.success('Mapping updated');
      } else {
        await associationsApi.createCompanyOwnerMapping(projectId, {
          sourceProperty: draftSource,
          targetHubspotProperty: draftTarget,
        });
        toast.success('Mapping added');
      }
      cancelDraft();
      load();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const removeMapping = async (id: string) => {
    try {
      await associationsApi.deleteCompanyOwnerMapping(projectId, id);
      toast.success('Mapping removed');
      load();
    } catch {
      toast.error('Failed to remove mapping');
    }
  };

  const propertyLabel = (name: string) =>
    hubspotProperties.find((p) => p.name === name)?.label ?? name;

  return (
    <div className="space-y-2 px-4 pb-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Owner Mappings
        </p>
        {!adding && !editingId && (
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus className="mr-1.5 size-3.5" /> Add Mapping
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-4 text-xs">
          <Spinner className="size-3.5" /> Loading mappings…
        </div>
      ) : mappings.length === 0 && !adding ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
          No mappings configured — defaults to{' '}
          <code className="text-primary">df_sales_email</code> →{' '}
          <code className="text-primary">hubspot_owner_id</code>. Add a mapping
          to customize which Dataforma fields assign which HubSpot owner
          properties.
        </p>
      ) : (
        <div className="space-y-1.5">
          {mappings.map((m) =>
            editingId === m.id ? (
              <MappingDraftRow
                key={m.id}
                sourceFields={sourceFields}
                hubspotProperties={hubspotProperties}
                draftSource={draftSource}
                draftTarget={draftTarget}
                setDraftSource={setDraftSource}
                setDraftTarget={setDraftTarget}
                duplicateTarget={duplicateTarget}
                saving={saving}
                onSave={saveDraft}
                onCancel={cancelDraft}
              />
            ) : (
              <div
                key={m.id}
                className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                <span className="font-mono">
                  {m.sourceProperty}{' '}
                  <span className="text-muted-foreground">→</span>{' '}
                  {propertyLabel(m.targetHubspotProperty)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(m)}
                    title="Edit mapping"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeMapping(m.id)}
                    title="Remove mapping"
                  >
                    <Trash2 className="text-destructive size-3.5" />
                  </Button>
                </span>
              </div>
            ),
          )}
        </div>
      )}

      {adding && (
        <MappingDraftRow
          sourceFields={sourceFields}
          hubspotProperties={hubspotProperties}
          draftSource={draftSource}
          draftTarget={draftTarget}
          setDraftSource={setDraftSource}
          setDraftTarget={setDraftTarget}
          duplicateTarget={duplicateTarget}
          saving={saving}
          onSave={saveDraft}
          onCancel={cancelDraft}
        />
      )}
    </div>
  );
}

function MappingDraftRow({
  sourceFields,
  hubspotProperties,
  draftSource,
  draftTarget,
  setDraftSource,
  setDraftTarget,
  duplicateTarget,
  saving,
  onSave,
  onCancel,
}: {
  sourceFields: ObjectField[];
  hubspotProperties: HubspotProperty[];
  draftSource: string;
  draftTarget: string;
  setDraftSource: (v: string) => void;
  setDraftTarget: (v: string) => void;
  duplicateTarget: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-muted/30 space-y-1.5 rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <Select value={draftSource} onValueChange={setDraftSource}>
          <SelectTrigger className="h-8 flex-1 font-mono text-xs">
            <SelectValue placeholder="Dataforma field…" />
          </SelectTrigger>
          <SelectContent>
            {sourceFields.map((f) => (
              <SelectItem key={f.field} value={f.field}>
                {f.field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">→</span>
        <Select value={draftTarget} onValueChange={setDraftTarget}>
          <SelectTrigger className="h-8 flex-1 text-xs" aria-invalid={duplicateTarget}>
            <SelectValue placeholder="HubSpot owner property…" />
          </SelectTrigger>
          <SelectContent>
            {hubspotProperties.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.label} ({p.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} title="Cancel">
          <X className="size-4" />
        </Button>
      </div>
      {duplicateTarget && (
        <p className="text-destructive text-xs">
          Another mapping already targets this property.
        </p>
      )}
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Spinner className="mr-1.5 size-3.5" /> : null}
        Save
      </Button>
    </div>
  );
}
