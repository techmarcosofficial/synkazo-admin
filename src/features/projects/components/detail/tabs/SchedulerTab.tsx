import { useProjectDetailContext } from '../context';

import JobScheduler from '@/components/jobs/JobScheduler';

export default function SchedulerTab() {
  const { projectId } = useProjectDetailContext();
  return <JobScheduler projectId={projectId} />;
}
