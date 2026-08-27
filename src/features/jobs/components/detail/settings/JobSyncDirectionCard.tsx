import { useEffect, useState } from 'react';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SyncDirectionFields from '@/features/jobs/components/SyncDirectionFields';
import { showToast } from '@/lib/toast';
import { useProjectConnectionsQuery } from '@/queries/useConnections';
import { usePlatformsQuery } from '@/queries/usePlatforms';
import type { Connection, PlatformId } from '@/types';

// Same fields as the Create Job wizard's Job Type step (via the shared
// SyncDirectionFields component) — lets an existing job switch between
// one-way and two-way (and adjust source-of-truth/delete-handling/sync
// trigger) without having to recreate it.
export default function JobSyncDirectionCard() {
  const { projectId, job, project, patchJob } = useJobDetailContext();
  const sourcePlatformId = project?.sourcePlatformId ?? '';
  const destPlatformId = project?.destPlatformId ?? '';

  const platformsQuery = usePlatformsQuery();
  const connectionsQuery = useProjectConnectionsQuery(projectId);
  const platforms = platformsQuery.data ?? [];
  const connections: Connection[] = connectionsQuery.data ?? [];
  const projectPlatforms = connections.map((c) => c.platformId) as PlatformId[];
  const availablePlatforms = platforms.filter((p) =>
    projectPlatforms.includes(p.platformId as PlatformId),
  );
  const getConnectionForPlatform = (
    platformId: string,
  ): Connection | undefined =>
    connections.find(
      (c) => c.platformId === platformId && c.status === 'connected',
    );

  const [syncDirection, setSyncDirection] = useState(
    job.syncDirection ?? 'one_way',
  );
  const [sourceOfTruth, setSourceOfTruth] = useState(
    job.sourceOfTruth ?? sourcePlatformId,
  );
  const [deleteHandling, setDeleteHandling] = useState(
    job.deleteHandling ?? 'ignore',
  );
  const [hubspotWebhookEnabled, setHubspotWebhookEnabled] = useState(
    job.hubspotWebhookEnabled ?? false,
  );
  const [syncTrigger, setSyncTrigger] = useState(job.syncTrigger ?? 'both');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSyncDirection(job.syncDirection ?? 'one_way');
    setSourceOfTruth(job.sourceOfTruth ?? sourcePlatformId);
    setDeleteHandling(job.deleteHandling ?? 'ignore');
    setHubspotWebhookEnabled(job.hubspotWebhookEnabled ?? false);
    setSyncTrigger(job.syncTrigger ?? 'both');
    setDirty(false);
  }, [job.id]);

  const withDirty =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setDirty(true);
    };

  // Structural fields (Job Type, Source of Truth, Deletes, Job Behavior) are
  // locked after creation — the only thing still editable here is the HubSpot
  // webhook opt-in (two-way only), so that's all we persist.
  const isTwoWay = syncDirection === 'two_way';

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = { hubspotWebhookEnabled };
      await jobsApi.updateJob(projectId, job.id, patch);
      patchJob(patch);
      setDirty(false);
      showToast.success('Job updated.');
    } catch {
      showToast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold">Sync Direction</h3>
        <p className="text-muted-foreground mb-4 text-xs">
          How this job moves records between platforms. Set at creation and
          locked from here on, aside from the HubSpot webhook opt-in.
        </p>

        <SyncDirectionFields
          syncDirection={syncDirection}
          sourceOfTruth={sourceOfTruth}
          deleteHandling={deleteHandling}
          hubspotWebhookEnabled={hubspotWebhookEnabled}
          syncTrigger={syncTrigger}
          sourcePlatform={sourcePlatformId}
          destPlatform={destPlatformId}
          availablePlatforms={availablePlatforms}
          sourceConnection={getConnectionForPlatform(sourcePlatformId)}
          destConnection={getConnectionForPlatform(destPlatformId)}
          projectId={projectId}
          onSyncDirectionChange={withDirty(setSyncDirection)}
          onSourceOfTruthChange={withDirty(setSourceOfTruth)}
          onDeleteHandlingChange={withDirty(setDeleteHandling)}
          onHubspotWebhookEnabledChange={withDirty(setHubspotWebhookEnabled)}
          onSyncTriggerChange={withDirty(setSyncTrigger)}
          fieldMappingLocationLabel="the Field Mapping tab"
          readOnly
        />

        {/* Structural fields are locked after creation; only the webhook opt-in
            (two-way) can still be saved. */}
        {isTwoWay && (
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="mt-5"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
