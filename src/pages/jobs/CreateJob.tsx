import { useNavigate, useParams } from 'react-router-dom';

import { CreateJobDialog } from '@/features/jobs/components/create';

export default function CreateJob() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const goBack = () => navigate(`/projects/${projectId}`);

  return (
    <CreateJobDialog
      projectId={projectId!}
      open
      onClose={goBack}
      onCreated={(jobId) =>
        navigate(`/projects/${projectId}/jobs/${jobId}?tab=field-mapping`, {
          state: {
            jobBackTo: `/projects/${projectId}?tab=sync-rules`,
            jobBackLabel: 'Back to Sync Jobs',
          },
        })
      }
    />
  );
}
