import { useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';
import {
  DangerZoneCard,
  GeneralSettingsCard,
  SchedulerSettingsCard,
} from '../settings';

export default function SettingsTab() {
  const navigate = useNavigate();
  const { project, jobs, patchProject } = useProjectDetailContext();

  return (
    <div className="space-y-4">
      <GeneralSettingsCard project={project} onUpdated={patchProject} />
      <SchedulerSettingsCard
        project={project}
        jobCount={jobs.length}
        onUpdated={patchProject}
      />
      <DangerZoneCard
        project={project}
        onDeleted={() => navigate('/projects')}
      />
    </div>
  );
}
