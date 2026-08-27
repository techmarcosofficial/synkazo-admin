import { Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ExtJob } from '@/features/jobs/hooks';
import { showToast } from '@/lib/toast';

export default function JobRetryCard({
  projectId,
  job,
  onUpdated,
}: {
  projectId: string;
  job: ExtJob;
  onUpdated: (patch: Partial<ExtJob>) => void;
}) {
  const [maxRetries, setMaxRetries] = useState(job.maxRetries ?? 0);
  const [retryBackoff, setRetryBackoff] = useState(
    job.retryBackoffBaseSec ?? 60,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await jobsApi.updateJob(projectId, job.id, {
        maxRetries,
        retryBackoffBaseSec: retryBackoff,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast.success('Retry settings saved.');
      onUpdated({ maxRetries, retryBackoffBaseSec: retryBackoff });
    } catch {
      showToast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold">Retry &amp; Recovery</h3>
        <p className="text-muted-foreground mb-4 text-xs">
          Automatic retry behaviour on failed scheduled runs.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Max Retries</FieldLabel>
              <p className="text-muted-foreground text-xs">
                0 = no automatic retry.
              </p>
              <Input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) =>
                  setMaxRetries(
                    Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                  )
                }
              />
            </Field>
            <Field>
              <FieldLabel>Backoff Base (seconds)</FieldLabel>
              <p className="text-muted-foreground text-xs">
                Delay = base × 2^(attempt−1).
              </p>
              <Input
                type="number"
                min={1}
                max={3600}
                value={retryBackoff}
                disabled={maxRetries === 0}
                onChange={(e) =>
                  setRetryBackoff(
                    Math.min(3600, Math.max(1, parseInt(e.target.value) || 60)),
                  )
                }
              />
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
