import { GitBranch, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import PageContextAlert from '@/components/shared/PageContextAlert';
import type { Job } from '@/types';

export default function PipelineMissingBanner({
  job,
  projectId,
}: {
  job: Job;
  projectId: string;
}) {
  return (
    <PageContextAlert
      variant="error"
      icon={GitBranch}
      title="Pipeline missing"
      description={`"${job.destObject}" requires a HubSpot pipeline but none is configured.`}
      actions={
        <Link
          to={`/projects/${projectId}/jobs/${job.id}`}
          className="text-destructive hover:text-foreground flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors"
        >
          <Settings className="size-3" /> Configure
        </Link>
      }
    />
  );
}
