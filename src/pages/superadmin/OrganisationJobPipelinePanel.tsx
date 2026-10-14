import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StatusMappingStep from '@/features/jobs/components/create/steps/StatusMappingStep';
import {
  useSuperAdminPipelinesQuery,
  useSuperAdminStatusesQuery,
  useUpdateSuperAdminJobMutation,
} from '@/queries/useSuperAdmin';
import type { SuperAdminJobDetail, SuperAdminProjectDetail } from '@/types/superAdmin';

interface Props {
  organisationId: string;
  project: SuperAdminProjectDetail;
  job: SuperAdminJobDetail;
}

export default function OrganisationJobPipelinePanel({ organisationId, project, job }: Props) {
  const [destPipelineId, setDestPipelineId] = useState(job.destPipelineId ?? '');
  const [statusMapping, setStatusMapping] = useState<Record<string, string | undefined>>(job.statusMapping ?? {});
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const pipelines = useSuperAdminPipelinesQuery(organisationId, project.id, job.destObject);
  const statuses = useSuperAdminStatusesQuery(organisationId, project.id, project.sourcePlatformId === 'servicetitan');
  const update = useUpdateSuperAdminJobMutation(organisationId, project.id, job.id);

  const save = async () => {
    if (!destPipelineId) { setError('Choose a destination pipeline.'); return; }
    const sourceStatuses = statuses.data?.map((status) => status.label) ?? [];
    if (sourceStatuses.some((status) => !statusMapping[status])) { setError('Map every source status to a destination stage.'); return; }
    setError(null);
    try {
      await update.mutateAsync({
        destPipelineId,
        statusMapping: Object.fromEntries(Object.entries(statusMapping).filter((entry): entry is [string, string] => !!entry[1])),
      });
      setDirty(false);
      toast.success('Pipeline mapping saved.');
    } catch (failure) {
      const response = failure as { response?: { data?: { message?: string | string[] } } };
      const message = response.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message ?? 'Could not save pipeline mapping.');
    }
  };

  return <Card className="gap-0 py-0"><CardContent className="space-y-4 px-4 py-4">
    <StatusMappingStep
      stStatuses={statuses.data?.map((status) => status.label) ?? []}
      pipelines={pipelines.data ?? []}
      destPipelineId={destPipelineId}
      onPipelineChange={(value) => { setDestPipelineId(value); setStatusMapping({}); setDirty(true); }}
      statusMapping={statusMapping}
      onStatusMappingChange={(updater) => { setStatusMapping(updater); setDirty(true); }}
      loading={pipelines.isLoading || statuses.isLoading}
      error={pipelines.isError || statuses.isError ? 'Could not load scoped pipeline or status data.' : null}
      onRetry={() => { pipelines.refetch(); statuses.refetch(); }}
    />
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex justify-end"><Button onClick={() => void save()} disabled={!dirty || update.isPending}>{update.isPending ? 'Saving…' : 'Save pipeline mapping'}</Button></div>
  </CardContent></Card>;
}
