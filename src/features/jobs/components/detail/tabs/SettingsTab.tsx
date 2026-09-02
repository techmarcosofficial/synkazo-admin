import { useNavigate } from 'react-router-dom';

import { useJobDetailContext } from '../context';
import {
  DataformaCustomerCursorCard,
  JobDangerZoneCard,
  JobGeneralCard,
  JobRetryCard,
  JobSkipUpdateCard,
  JobSyncDirectionCard,
} from '../settings';

import { jobsApi } from '@/api/jobs';
import { showToast } from '@/lib/toast';

export default function SettingsTab() {
  const navigate = useNavigate();
  const { projectId, job, project, patchJob } = useJobDetailContext();
  const showDataformaCustomerCursor =
    project?.sourcePlatformId === 'dataforma' &&
    job.sourceObject === 'customers';

  const handleDelete = async () => {
    try {
      await jobsApi.deleteJob(projectId, job.id);
      showToast.success('Job deleted.');
    } catch {
      showToast.error('Something went wrong. Please try again.');
      throw new Error('Failed to delete job');
    }
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <JobGeneralCard projectId={projectId} job={job} onUpdated={patchJob} />
        <JobRetryCard projectId={projectId} job={job} onUpdated={patchJob} />
      </div>
      <JobSyncDirectionCard />
      <JobSkipUpdateCard projectId={projectId} job={job} onUpdated={patchJob} />
      {showDataformaCustomerCursor && (
        <DataformaCustomerCursorCard
          projectId={projectId}
          job={job}
          onUpdated={patchJob}
        />
      )}
      <JobDangerZoneCard onDelete={handleDelete} />
    </div>
  );
}
