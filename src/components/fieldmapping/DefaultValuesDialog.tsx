import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FieldSelect, type FieldDef } from './FieldMappingCanvas';

import { jobsApi } from '@/api/jobs';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import type { DefaultValuesConfig, Job } from '@/types/job';

type Section = 'destination' | 'source';
type Row = { field: string; value: string };
type Rows = Record<Section, Row[]>;

const toRows = (defaults: DefaultValuesConfig | null | undefined): Rows => ({
  destination: Object.entries(defaults?.destination ?? {}).map(
    ([field, value]) => ({
      field,
      value: String(value ?? ''),
    }),
  ),
  source: Object.entries(defaults?.source ?? {}).map(([field, value]) => ({
    field,
    value: String(value ?? ''),
  })),
});

function parseValue(value: string, type?: string): unknown {
  const normalized = type?.toLowerCase();
  if (
    ['number', 'integer', 'int', 'float', 'double', 'decimal'].includes(
      normalized ?? '',
    )
  ) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('Enter a valid number.');
    return number;
  }
  if (['boolean', 'bool'].includes(normalized ?? '')) {
    if (value.toLowerCase() !== 'true' && value.toLowerCase() !== 'false') {
      throw new Error('Enter true or false for a boolean field.');
    }
    return value.toLowerCase() === 'true';
  }
  return value;
}

export interface DefaultValuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  job: Job;
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  sourcePlatform: string;
  destinationPlatform: string;
  mappedSourceKeys: string[];
  mappedDestinationKeys: string[];
  mappings: Array<{ sourceField: string; destField: string | string[] }>;
  onSaved: (job: Job) => void;
}

export default function DefaultValuesDialog({
  open,
  onOpenChange,
  projectId,
  job,
  sourceFields,
  destinationFields,
  sourcePlatform,
  destinationPlatform,
  mappedSourceKeys,
  mappedDestinationKeys,
  mappings,
  onSaved,
}: DefaultValuesDialogProps) {
  const twoWay = job.syncDirection === 'two_way';
  const [rows, setRows] = useState<Rows>(() => toRows(job.defaultValues));
  const [view, setView] = useState<'all' | Section>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRows(toRows(job.defaultValues));
      setView('all');
      setError(null);
    }
  }, [open, job.defaultValues]);

  const updateRow = (section: Section, index: number, change: Partial<Row>) => {
    setRows((previous) => ({
      ...previous,
      [section]: previous[section].map((row, i) =>
        i === index ? { ...row, ...change } : row,
      ),
    }));
    setError(null);
  };

  const removeRow = (section: Section, index: number) => {
    setRows((previous) => ({
      ...previous,
      [section]: previous[section].filter((_, i) => i !== index),
    }));
    setError(null);
  };

  const addRow = (section: Section) => {
    setRows((previous) => ({
      ...previous,
      [section]: [...previous[section], { field: '', value: '' }],
    }));
  };

  const save = async () => {
    try {
      const config: DefaultValuesConfig = {};
      for (const section of (twoWay
        ? ['destination', 'source']
        : ['destination']) as Section[]) {
        const fields =
          section === 'destination' ? destinationFields : sourceFields;
        const values: Record<string, unknown> = {};
        for (const row of rows[section]) {
          if (!row.field)
            throw new Error('Choose a field for every default value.');
          if (row.value === '')
            throw new Error(`Enter a default value for ${row.field}.`);
          if (Object.prototype.hasOwnProperty.call(values, row.field)) {
            throw new Error(`Only one default is allowed for ${row.field}.`);
          }
          const field = fields.find((candidate) => candidate.key === row.field);
          if (!field)
            throw new Error(`The field ${row.field} is no longer available.`);
          values[row.field] = parseValue(row.value, field.type);
        }
        if (Object.keys(values).length > 0) config[section] = values;
      }
      setSaving(true);
      const updated = await jobsApi.updateJob(projectId, job.id, {
        defaultValues: Object.keys(config).length ? config : null,
      });
      onSaved(updated);
      onOpenChange(false);
      toast.success('Default values saved');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save default values.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (section: Section) => {
    const destination = section === 'destination';
    const platform = destination ? destinationPlatform : sourcePlatform;
    const object = destination ? job.destObject : job.sourceObject;
    const fields = destination ? destinationFields : sourceFields;
    const mappedKeys = destination ? mappedDestinationKeys : mappedSourceKeys;
    const title = destination ? 'Destination Defaults' : 'Source Defaults';
    return (
      <section key={section} className="border-border rounded-2xl border p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-muted-foreground text-xs">
              Applied when writing to {platform} {object}.
            </p>
          </div>
          <Badge variant="secondary" size="xs">
            {rows[section].length} Defaults
          </Badge>
        </div>
        <div className="space-y-3">
          {rows[section].map((row, index) => {
            const mapped = mappedKeys.includes(row.field);
            const mapping = mappings.find((item) =>
              destination
                ? (Array.isArray(item.destField)
                    ? item.destField
                    : [item.destField]
                  ).includes(row.field)
                : item.sourceField === row.field,
            );
            const from = destination
              ? mapping?.sourceField
              : mapping &&
                (Array.isArray(mapping.destField)
                  ? mapping.destField.join(', ')
                  : mapping.destField);
            return (
              <div
                key={`${section}-${index}`}
                className="bg-muted/20 rounded-xl border p-3"
              >
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <FieldSelect
                    fields={fields}
                    value={row.field}
                    onChange={(field) => updateRow(section, index, { field })}
                    placeholder="Search all available fields"
                    mappedFieldKeys={mappedKeys}
                    showMappingStatus
                    highlightRequired={false}
                    aria-label={`${title} field ${index + 1}`}
                    className="sm:w-64"
                  />
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      updateRow(section, index, { value: event.target.value })
                    }
                    placeholder="Default value"
                    aria-label={`${title} value ${index + 1}`}
                    className="h-8 min-w-0 flex-1 text-xs"
                  />
                  <Badge
                    variant={mapped ? 'secondary' : 'outline'}
                    size="xs"
                    className="self-start sm:self-auto"
                  >
                    {mapped ? 'Mapped' : 'Unmapped'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Clear ${title} value ${index + 1}`}
                      onClick={() => updateRow(section, index, { value: '' })}
                    >
                      <X className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${title} default ${index + 1}`}
                      onClick={() => removeRow(section, index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {row.field && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {mapped
                      ? `Mapped from ${from || 'another field'}; used when that value is empty.`
                      : 'Unmapped; applied to every written record.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={() => addRow(section)}
        >
          <Plus className="size-3.5" /> Add{' '}
          {destination ? 'Destination' : 'Source'} Default Value
        </Button>
      </section>
    );
  };

  const count = rows.destination.length + (twoWay ? rows.source.length : 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        padding="none"
        size="lg"
        className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[860px] data-[size]:sm:max-w-[860px]"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" size="xs">
              Default Values
            </Badge>
            <Badge variant="outline" size="xs">
              {twoWay ? 'Two-Way Sync' : 'One-Way Sync'}
            </Badge>
            <Badge variant="secondary" size="xs">
              {count} Active Defaults
            </Badge>
          </div>
          <DialogTitle className="mt-1 flex items-center gap-2 text-base">
            <Sparkles className="text-primary size-5" />
            Field Default Values
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set values for unmapped fields or fill empty mapped values when
            writing records.
          </DialogDescription>
        </DialogHeader>
        {twoWay && (
          <div className="bg-muted/20 flex flex-wrap gap-1 border-b px-6 py-2.5">
            {(['all', 'destination', 'source'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={view === option ? 'secondary' : 'ghost'}
                className={cn('h-7 text-xs')}
                onClick={() => setView(option)}
              >
                {option === 'all'
                  ? `All Defaults (${count})`
                  : option === 'destination'
                    ? `${destinationPlatform} Defaults (${rows.destination.length})`
                    : `${sourcePlatform} Defaults (${rows.source.length})`}
              </Button>
            ))}
          </div>
        )}
        <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
          {(view === 'all' || view === 'destination') &&
            renderSection('destination')}
          {twoWay &&
            (view === 'all' || view === 'source') &&
            renderSection('source')}
          {error && (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
