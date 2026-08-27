import { useNavigate, useParams } from 'react-router-dom';

import { CreateJobDialog } from '@/features/jobs/components/create';
import { showToast } from '@/lib/toast';

export default function CreateJob() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const goBack = () => navigate(`/projects/${projectId}`);

  return (
    <CreateJobDialog
      projectId={projectId!}
      open
      onClose={goBack}
      onCreated={() => {
        showToast.success('Job created successfully!');
        goBack();
      }}
    />
  );
}
