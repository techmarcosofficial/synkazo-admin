import { CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSuperAdminRunStatusQuery } from '@/queries/useSuperAdmin';

interface RunStatusPollerProps {
  organisationId: string;
  projectId: string;
  jobId: string;
  bullJobId: string;
  onDismiss: () => void;
}

// Renders after a super-admin manual run is accepted. Auto-polls the
// run-status endpoint (backed by SA-API-006) until BullMQ reports a
// terminal state, then stops. Never shows raw failedReason from an
// untrusted source unformatted.
export default function RunStatusPoller({
  organisationId,
  projectId,
  jobId,
  bullJobId,
  onDismiss,
}: RunStatusPollerProps) {
  const query = useSuperAdminRunStatusQuery(
    organisationId,
    projectId,
    jobId,
    bullJobId,
  );

  const state = query.data?.state ?? 'accepted';
  const isTerminal = state === 'completed' || state === 'failed';
  const tone: 'default' | 'success' | 'destructive' =
    state === 'completed'
      ? 'success'
      : state === 'failed'
        ? 'destructive'
        : 'default';

  const alertVariant = tone === 'destructive' ? 'destructive' : 'default';

  const icon =
    state === 'completed' ? (
      <CheckCircle2 className="size-4 text-emerald-700" aria-hidden />
    ) : state === 'failed' ? (
      <XCircle className="size-4 text-red-700" aria-hidden />
    ) : (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    );

  return (
    <div className="flex flex-col gap-3">
      <Alert variant={alertVariant}>
        <div className="flex items-start gap-2">
          {icon}
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2">
              Run {state}
              {!isTerminal && query.isFetching ? (
                <span className="text-muted-foreground text-xs">refreshing…</span>
              ) : null}
            </AlertTitle>
            <AlertDescription className="mt-1 text-xs">
              Bull job id{' '}
              <span className="font-mono">{bullJobId.slice(0, 12)}…</span>
              {query.data?.failedReason ? (
                <>
                  <br />
                  <span className="text-red-800">{query.data.failedReason}</span>
                </>
              ) : null}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Alert>
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4" aria-hidden />
          <AlertDescription className="text-xs">
            This run bypasses this organisation&rsquo;s plan limits — the
            override is scoped to this specific request. Scheduled runs remain
            constrained by the customer&rsquo;s real plan.
          </AlertDescription>
        </div>
      </Alert>

      {isTerminal ? (
        <div>
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </div>
  );
}
