import { Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ExtJob } from '@/features/jobs/hooks';
import { showToast } from '@/lib/toast';

/**
 * Dataforma's Customers endpoint has no create/modify-date filter — every
 * sync fetches every customer record, and "new since last sync" is tracked
 * locally by id instead. Only shown for a Dataforma-sourced job whose
 * sourceObject is 'customers' — see SettingsTab.tsx and
 * dataforma-customer-cursor.util.ts on the backend.
 */
export default function DataformaCustomerCursorCard({
  projectId,
  job,
  onUpdated,
}: {
  projectId: string;
  job: ExtJob;
  onUpdated: (patch: Partial<ExtJob>) => void;
}) {
  const [startingId, setStartingId] = useState(
    job.dataformaStartingCustomerId ?? 0,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await jobsApi.updateJob(projectId, job.id, {
        dataformaStartingCustomerId: startingId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast.success('Starting customer ID saved.');
      onUpdated({ dataformaStartingCustomerId: startingId });
    } catch {
      showToast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold">Dataforma Customer Sync Cursor</h3>
        <p className="text-muted-foreground mb-4 text-xs">
          Dataforma&apos;s Customers API has no date filter — each sync pages
          through customers newest-first and stops as soon as it reaches this
          ID, keeping only customers with an ID greater than it. The floor
          advances automatically to the highest customer ID synced each
          cycle.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Starting Customer ID</FieldLabel>
              <p className="text-muted-foreground text-xs">
                0 = sync every customer from the beginning.
              </p>
              <Input
                type="number"
                min={0}
                value={startingId}
                onChange={(e) =>
                  setStartingId(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Currently Synced Through</FieldLabel>
              <p className="text-muted-foreground text-xs">
                Highest customer ID synced so far.
              </p>
              <div className="bg-muted text-muted-foreground truncate rounded-3xl px-3 py-2 text-sm">
                {job.dataformaCustomerIdCursor ?? '—'}
              </div>
            </Field>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RotateCcw className="animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <Check /> Saved
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
