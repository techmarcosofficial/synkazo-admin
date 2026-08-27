import { useEffect, useState } from 'react';

import { jobsApi } from '@/api/jobs';
import { Card, CardContent } from '@/components/ui/card';
import type { Job } from '@/types';

// Rendered as the ConfirmDialog's `body` slot for a disconnect confirmation —
// fetches the project's jobs to show what the disconnect will impact.
export default function DisconnectImpactBody({
  projectId,
}: {
  projectId: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    jobsApi
      .listJobs(projectId)
      .then((j) => setJobs(Array.isArray(j) ? j : []))
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [projectId]);

  const activeJobs = jobs.filter((j) => j.isEnabled).length;
  const runningSyncs = jobs.filter((j) => j.status === 'active').length;
  const scheduled = jobs.filter(
    (j) => j.cronExpression || j.intervalMinutes,
  ).length;
  const hasImpact = activeJobs > 0 || runningSyncs > 0 || scheduled > 0;

  return (
    <div className="space-y-4">
      {!loadingJobs && hasImpact && (
        <Card className="py-0">
          <CardContent className="space-y-3 p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Currently active in this project
            </p>
            <div className="flex gap-6">
              {activeJobs > 0 && (
                <div className="text-center">
                  <div className="text-warning text-2xl font-bold">
                    {activeJobs}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Active Jobs
                  </div>
                </div>
              )}
              {runningSyncs > 0 && (
                <div className="text-center">
                  <div className="text-destructive text-2xl font-bold">
                    {runningSyncs}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Running Syncs
                  </div>
                </div>
              )}
              {scheduled > 0 && (
                <div className="text-center">
                  <div className="text-paused text-2xl font-bold">
                    {scheduled}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Scheduled
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-destructive bg-destructive/10 rounded-xl p-4 text-sm leading-relaxed">
        Disconnecting this environment will impact existing jobs, syncs,
        mappings, and automation processes. Some functionality may stop working
        until a valid connection is configured again.
      </p>
    </div>
  );
}
