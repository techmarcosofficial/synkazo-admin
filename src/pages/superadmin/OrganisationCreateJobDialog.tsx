import { useState } from 'react';
import { toast } from 'sonner';

import CreateJobDialogFrame from '@/features/jobs/components/create/CreateJobDialogFrame';
import { PlatformObjectSelectorView, type PlatformObjectSelectorProps } from '@/features/jobs/components/create/PlatformObjectSelector';
import JobDetailsStep from '@/features/jobs/components/create/steps/JobDetailsStep';
import type { JobConfig } from '@/features/jobs/types';
import type { ObjectItem } from '@/queries/useConnections';
import {
  useCreateSuperAdminJobMutation,
  useSuperAdminDiscoveredObjectsQuery,
} from '@/queries/useSuperAdmin';
import type {
  SuperAdminJobListItem,
  SuperAdminProjectConnection,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';

function ScopedObjectSelector(props: PlatformObjectSelectorProps) {
  return (
    <PlatformObjectSelectorView
      {...props}
      policy={{ objectTierAllowed: () => true, planAllowsCustomObjects: false }}
    />
  );
}

interface Props {
  organisationId: string;
  project: SuperAdminProjectDetail;
  connections: SuperAdminProjectConnection[];
  jobs: SuperAdminJobListItem[];
  onClose: () => void;
  onCreated: (jobId: string) => void;
}

export default function OrganisationCreateJobDialog({
  organisationId,
  project,
  connections,
  jobs,
  onClose,
  onCreated,
}: Props) {
  const [config, setConfig] = useState<JobConfig>({
    sourcePlatform: project.sourcePlatformId,
    destPlatform: project.destPlatformId,
    sourceObject: '',
    destObject: '',
    name: '',
    syncDirection: project.syncMode || 'one_way',
    sourceOfTruth: '',
    deleteHandling: 'ignore',
    hubspotWebhookEnabled: false,
    syncTrigger: 'both',
    idMappingSourceField: '',
    idMappingDestField: '',
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateSuperAdminJobMutation(organisationId, project.id);
  const sourceObjects = useSuperAdminDiscoveredObjectsQuery(organisationId, project.id, config.sourcePlatform);
  const destObjects = useSuperAdminDiscoveredObjectsQuery(organisationId, project.id, config.destPlatform);
  const connectionReady = [config.sourcePlatform, config.destPlatform].every((platform) =>
    connections.some((connection) => connection.platformId === platform && connection.environment === project.activeEnvironment && connection.status === 'connected'),
  );

  const save = async () => {
    if (create.isPending) return;
    const nextErrors: Record<string, string> = {};
    if (!config.sourceObject) nextErrors.sourceObject = 'Select a source object';
    if (!config.destObject) nextErrors.destObject = 'Select a destination object';
    if (!config.name.trim()) nextErrors.name = 'Job name is required — enter a name for this job before continuing';
    if (config.sourcePlatform === config.destPlatform && config.sourceObject && config.sourceObject.toLowerCase() === config.destObject.toLowerCase()) {
      nextErrors.destObject = 'Destination object must differ from the source object when both are on the same platform';
    }
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    if (!connectionReady) { setFormError('Connected source and destination accounts are required.'); return; }
    setErrors({});
    setFormError(null);
    try {
      const syncDirection = project.syncMode === 'one_way' || project.syncMode === 'two_way' ? project.syncMode : config.syncDirection;
      const job = await create.mutateAsync({
        name: config.name.trim(),
        sourceObject: config.sourceObject,
        destObject: config.destObject,
        syncDirection: syncDirection as 'one_way' | 'two_way',
        syncTrigger: config.syncTrigger as 'new' | 'updated' | 'both',
        ...(syncDirection === 'two_way' && {
          sourceOfTruth: config.sourceOfTruth,
          deleteHandling: config.deleteHandling as 'ignore' | 'soft_archive' | 'hard_delete',
          hubspotWebhookEnabled: config.hubspotWebhookEnabled,
        }),
        idMappingSourceField: config.idMappingSourceField || undefined,
        idMappingDestField: config.idMappingDestField || undefined,
      });
      toast.success('Sync job created successfully!');
      onCreated(job.id);
    } catch (error) {
      const response = error as { response?: { data?: { message?: string | string[] } } };
      const message = response.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join(', ') : message ?? 'Failed to create sync job. Please try again.');
    }
  };

  return (
    <CreateJobDialogFrame
      open
      onClose={onClose}
      onSubmit={() => void save()}
      isSaving={create.isPending}
      isDirty={Boolean(config.sourceObject || config.destObject || config.name)}
      submitLabel="Create Sync Job"
    >
      {!connectionReady && <p role="alert" className="text-destructive mb-3 text-sm">Connected source and destination accounts are required.</p>}
      {(sourceObjects.isError || destObjects.isError) && <p role="alert" className="text-destructive mb-3 text-sm">Could not discover project objects. Reopen this dialog to retry.</p>}
      <JobDetailsStep
        config={config}
        setConfig={setConfig}
        errors={errors}
        setErrors={setErrors}
        availablePlatforms={[
          { platformId: project.sourcePlatformId, label: project.sourcePlatformId },
          { platformId: project.destPlatformId, label: project.destPlatformId },
        ]}
        objectsByPlatform={{
          [config.sourcePlatform]: (sourceObjects.data ?? []) as ObjectItem[],
          [config.destPlatform]: (destObjects.data ?? []) as ObjectItem[],
        }}
        customSourceObjects={[]}
        customDestObjects={[]}
        onAddCustomObject={() => undefined}
        projectId={project.id}
        projectSyncMode={project.syncMode === 'one_way' || project.syncMode === 'two_way' ? project.syncMode : null}
        compact
        existingJobs={jobs}
        ObjectSelector={ScopedObjectSelector}
        allowCustomObjectCreation={false}
        allowPlatformSwap={false}
        twoWayNotice={null}
      />
      {formError && <p role="alert" className="text-destructive mt-3 text-sm">{formError}</p>}
    </CreateJobDialogFrame>
  );
}
