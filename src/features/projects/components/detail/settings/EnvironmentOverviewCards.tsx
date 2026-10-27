import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Lock,
} from 'lucide-react';

import { connectionsApi, type SharedSourceAcknowledgement } from '@/api/connections';
import { PlatformIcon } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type {
  ConnectionExt,
  ProjectExt,
} from '@/features/projects/hooks/useProjectDetail';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { ProjectEnvironment } from '@/types';
import { toast } from 'sonner';

function environmentConnection(
  connections: ConnectionExt[],
  environment: ProjectEnvironment,
  type: 'source' | 'destination',
) {
  const matches = connections.filter(
    (connection) =>
      (connection.environment ?? 'production') === environment &&
      connection.connectionType === type,
  );
  return (
    matches.find((connection) => connection.status === 'connected') ??
    matches[0]
  );
}

export function environmentReadiness(
  connections: ConnectionExt[],
  environment: ProjectEnvironment,
) {
  const source = environmentConnection(connections, environment, 'source');
  const destination = environmentConnection(
    connections,
    environment,
    'destination',
  );
  return {
    source,
    destination,
    ready:
      source?.status === 'connected' && destination?.status === 'connected',
  };
}

function ConnectionItem({
  label,
  platformId,
  connection,
}: {
  label: string;
  platformId: string | null | undefined;
  connection: ConnectionExt | undefined;
}) {
  return (
    <div className="bg-card flex h-auto min-h-20 items-center justify-between gap-3 rounded-2xl border px-3 py-1.5">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {platformId ? (
            <PlatformIcon
              platformId={platformId}
              variant="icon-text"
              size="sm"
              className="max-w-full min-w-0 text-xs font-medium"
            />
          ) : (
            <span className="text-muted-foreground text-xs font-medium">
              Not selected
            </span>
          )}
          {connection?.accountName && (
            <span className="text-muted-foreground truncate text-xs">
              ({connection.accountName})
            </span>
          )}
        </div>
      </div>
      <StatusBadge status={connection?.status ?? 'disconnected'} size="sm" />
    </div>
  );
}

export default function EnvironmentOverviewCards({
  project,
  connections,
  activeEnvironment,
  activating,
  activationError,
  clearActivationError,
  onActivate,
  onGoToConnections,
}: {
  project: ProjectExt;
  connections: ConnectionExt[];
  activeEnvironment: ProjectEnvironment | null;
  activating: boolean;
  activationError: string | null;
  clearActivationError: () => void;
  onActivate: (environment: ProjectEnvironment, expectedGeneration?: string) => Promise<void>;
  onGoToConnections: () => void;
}) {
  const { confirm } = useConfirmDialog();
  const { hasRole } = useSynkazoAuth();
  const canActivate = hasRole('org_admin');

  const readiness = {
    sandbox: environmentReadiness(connections, 'sandbox'),
    production: environmentReadiness(connections, 'production'),
  };
  const sameHubSpotAccount = (
    sandbox?: ConnectionExt,
    production?: ConnectionExt,
  ) => sandbox?.platformId === 'hubspot' &&
    production?.platformId === 'hubspot' &&
    sandbox.providerHubId != null &&
    sandbox.providerHubId === production.providerHubId;
  const sharedSource = sameHubSpotAccount(
    readiness.sandbox.source, readiness.production.source,
  );
  const sharedDestination = sameHubSpotAccount(
    readiness.sandbox.destination, readiness.production.destination,
  );
  const [sharedSourceStatus, setSharedSourceStatus] = useState<SharedSourceAcknowledgement | null>(null);
  const [sharedSourceError, setSharedSourceError] = useState<string | null>(null);
  const [checkingSharedSource, setCheckingSharedSource] = useState(false);
  const [acknowledgingSource, setAcknowledgingSource] = useState(false);
  const [sourceCheckVersion, setSourceCheckVersion] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const sourceCheckKey = [
    readiness.sandbox.source?.id, readiness.sandbox.source?.status,
    readiness.sandbox.source?.providerHubId, readiness.sandbox.source?.updatedAt,
    readiness.production.source?.id, readiness.production.source?.status,
    readiness.production.source?.providerHubId, readiness.production.source?.updatedAt,
  ].join(':');

  useEffect(() => {
    if (!readiness.sandbox.source || !readiness.production.source) {
      setSharedSourceStatus(null);
      setSharedSourceError(null);
      return;
    }
    let cancelled = false;
    setCheckingSharedSource(true);
    setSharedSourceError(null);
    void connectionsApi.getSharedSourceAcknowledgement(project.id)
      .then((status) => { if (!cancelled) setSharedSourceStatus(status); })
      .catch(() => {
        if (!cancelled) {
          setSharedSourceStatus(null);
          setSharedSourceError('Could not verify whether Sandbox shares the live source account. Refresh to retry.');
        }
      })
      .finally(() => { if (!cancelled) setCheckingSharedSource(false); });
    return () => { cancelled = true; };
    // The key captures account bindings and status without refetching on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, sourceCheckKey, sourceCheckVersion]);

  const requestSharedSourceAcknowledgement = () => {
    if (!sharedSourceStatus?.fingerprint || acknowledgingSource) return;
    const expectedFingerprint = sharedSourceStatus.fingerprint;
    confirm({
      variant: 'warning',
      title: 'Acknowledge live source account?',
      description: `${sharedSourceStatus.accountName ?? sharedSourceStatus.platformId ?? 'This source'} (${sharedSourceStatus.accountIdentity ?? 'identity unavailable'}) is connected to both Sandbox and Production.`,
      body: (
        <p className="text-sm">
          Sandbox may read data from this live account. Reverse writes to it remain blocked.
          Check the account before running a Sandbox job.
        </p>
      ),
      confirmLabel: 'Acknowledge shared source',
      onConfirm: async () => {
        setAcknowledgingSource(true);
        try {
          await connectionsApi.acknowledgeSharedSource(project.id, expectedFingerprint);
          setSourceCheckVersion((version) => version + 1);
          toast.success('Shared source account acknowledged for Sandbox sync.');
        } catch (error) {
          const message = (error as { response?: { data?: { message?: string } } })
            .response?.data?.message ?? 'Account changed or acknowledgement failed. Refresh and review it again.';
          setSharedSourceError(message);
          toast.error(message);
        } finally {
          setAcknowledgingSource(false);
        }
      },
    });
  };

  const requestActivation = async (env: ProjectEnvironment) => {
    clearActivationError();
    setPreviewError(null);
    setPreviewing(true);
    let preview;
    try {
      preview = await connectionsApi.previewEnvironmentSwitch(project.id, env);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message ?? 'Could not preview this switch. Refresh and retry.';
      setPreviewError(message);
      setPreviewing(false);
      return;
    }
    setPreviewing(false);
    if (!preview.canSwitch) {
      const { runningJobs, runningRuns, priorityCycles, associationRuns } = preview.blockers;
      setPreviewError(
        `Switch blocked: ${runningJobs} running jobs, ${runningRuns} running runs, ` +
        `${priorityCycles} priority cycles and ${associationRuns} association runs. ` +
        (preview.targetReady ? 'Wait for them to finish.' : 'Verify the target connections.'),
      );
      return;
    }
    const targetLabel = env === 'sandbox' ? 'Sandbox' : 'Production';
    const currentLabel = activeEnvironment
      ? activeEnvironment === 'sandbox'
        ? 'Sandbox'
        : 'Production'
      : 'no active environment';

    confirm({
      variant: 'warning',
      title: `${activeEnvironment ? 'Switch to' : 'Activate'} ${targetLabel}?`,
      description: `This changes the active sync environment from ${currentLabel} to ${targetLabel}.`,
      body: (
        <div className="space-y-2 text-sm">
          <p>
            Wait for running syncs and priority stages to finish. Switching
            pauses job activation, schedules, priority scheduling, and webhook
            write-back. Review and resume each action manually on return.
          </p>
          <p>
            {preview.jobsToPause} enabled job(s) will pause. Target workspace:
            {' '}{preview.targetCounts?.jobs ?? 0} saved job(s),
            {' '}{preview.targetCounts?.runs ?? 0} run(s),
            {' '}{preview.targetCounts?.runLogs ?? 0} run log(s).
          </p>
          <p>
            Target destination: {preview.targetDestination?.accountName ??
              preview.targetDestination?.accountIdentity ?? 'unlabelled account'}.
            {' '}{preview.pendingWebhookEvents} pending webhook event(s) will be checked against workspace ownership.
          </p>
          {preview.sandboxDestinationWriteSafety && !preview.sandboxDestinationWriteSafety.allowed && (
            <p className="text-destructive">
              {preview.sandboxDestinationWriteSafety.reason}
            </p>
          )}
          <p className="text-muted-foreground">
            This does not copy jobs, mappings, objects, or properties between
            environments.
          </p>
        </div>
      ),
      confirmLabel: activeEnvironment
        ? `Switch to ${targetLabel}`
        : `Activate ${targetLabel}`,
      onConfirm: () => onActivate(env, preview.expectedGeneration),
    });
  };

  return (
    <div className="space-y-4">
      {sharedSource && !sharedSourceStatus?.shared && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Shared external source account: Sandbox and Production connect to the same
            HubSpot portal. Sandbox reverse writes to this live source are blocked.
          </AlertDescription>
        </Alert>
      )}
      {!sharedSource && !sharedSourceStatus?.shared && readiness.sandbox.source && readiness.production.source && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Check the Sandbox source account before syncing. Some platforms can connect
            the same live account in both workspaces; Sandbox reverse writes to a
            shared Production source are blocked.
          </AlertDescription>
        </Alert>
      )}
      {checkingSharedSource && readiness.sandbox.source && readiness.production.source && (
        <p className="text-muted-foreground text-xs">Checking source account identity…</p>
      )}
      {sharedSourceError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {sharedSourceError}
            <Button size="sm" variant="outline" onClick={() => setSourceCheckVersion((version) => version + 1)}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {sharedSourceStatus?.verificationRequired && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            The source account identity could not be verified. Check both connections before Sandbox sync.
          </AlertDescription>
        </Alert>
      )}
      {sharedSourceStatus?.shared && (
        <Alert variant={sharedSourceStatus.acknowledged ? 'default' : 'destructive'}>
          <AlertCircle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Sandbox and Production share {sharedSourceStatus.accountName ?? sharedSourceStatus.platformId ?? 'the same source account'}
              {sharedSourceStatus.accountIdentity && ` (${sharedSourceStatus.accountIdentity})`}.
              Sandbox can read this live source only after acknowledgement. Reverse writes remain blocked.
              {sharedSourceStatus.acknowledged && ' Acknowledged for this account pair.'}
            </span>
            {!sharedSourceStatus.acknowledged && (
              <Button
                size="sm"
                variant="outline"
                disabled={!canActivate || acknowledgingSource}
                onClick={requestSharedSourceAcknowledgement}
              >
                {!canActivate && <Lock className="size-3" />}
                {acknowledgingSource ? 'Saving…' : 'Acknowledge source'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {sharedDestination && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Sandbox destination writes are blocked because both workspaces use the
            same live HubSpot portal. Connect a distinct Sandbox destination.
          </AlertDescription>
        </Alert>
      )}
      {activationError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertDescription>{activationError}</AlertDescription>
        </Alert>
      )}
      {previewError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      )}

      {/* Unified Active Sync Environment Card */}
      <Card className="bg-card gap-0 rounded-3xl border py-0">
        {/* Card Header (White / bg-card) */}
        <CardHeader className="bg-card border-b px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Active sync environment</CardTitle>
              {activeEnvironment ? (
                <StatusBadge
                  status={activeEnvironment}
                  label={
                    activeEnvironment === 'production'
                      ? 'Production (Live)'
                      : 'Sandbox workspace'
                  }
                  size="sm"
                />
              ) : (
                <Badge variant="outline">Not activated</Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="text-foreground font-medium">
              {activeEnvironment
                ? `${activeEnvironment} is active`
                : 'No environment active'}
            </span>
            {project.environmentActivatedAt && (
              <span>
                {' '}
                · Activated{' '}
                {new Date(project.environmentActivatedAt).toLocaleDateString()}
              </span>
            )}
            . Both source and destination platforms must be connected before an
            environment can run syncs.
          </p>
        </CardHeader>

        <div className="divide-border bg-muted/40 grid grid-cols-1 divide-y overflow-hidden md:grid-cols-2 md:divide-x md:divide-y-0">
          {/* Left Column: Sandbox */}
          <div className="flex flex-col justify-between gap-2.5 p-3 sm:p-3.5">
            <div className="space-y-2">
              <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">Sandbox</span>
                  {activeEnvironment === 'sandbox' && (
                    <Badge variant="default" size="xs">
                      Active
                    </Badge>
                  )}
                  <StatusBadge
                    status={
                      readiness.sandbox.ready ? 'connected' : 'disconnected'
                    }
                    label={
                      readiness.sandbox.ready
                        ? 'Pair Connected'
                        : 'Incomplete Pair'
                    }
                    size="sm"
                  />
                </div>
                {activeEnvironment === 'sandbox' ? (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <CheckCircle2 className="text-success size-3.5 shrink-0" />
                    <span>Selected workspace</span>
                  </div>
                ) : readiness.sandbox.ready ? (
                  canActivate ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void requestActivation('sandbox')}
                      disabled={activating || previewing}
                      className="h-7 gap-1 text-xs"
                    >
                      {activating || previewing ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <ArrowRight className="size-3" />
                      )}
                      {previewing ? 'Reviewing…' : activating ? 'Activating…' : 'Switch to Sandbox'}
                    </Button>
                  ) : (
                    <Badge variant="secondary" size="xs">
                      Admin access required
                    </Badge>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onGoToConnections}
                    className="h-7 gap-1 text-xs"
                  >
                    Configure Sandbox
                    <ExternalLink className="size-3" />
                  </Button>
                )}
              </div>

              {/* Side-by-side platform connection items */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <ConnectionItem
                  label="Source platform"
                  platformId={project.sourcePlatformId}
                  connection={readiness.sandbox.source}
                />
                <ConnectionItem
                  label="Destination platform"
                  platformId={project.destPlatformId}
                  connection={readiness.sandbox.destination}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Production */}
          <div className="flex flex-col justify-between gap-2.5 p-3 sm:p-3.5">
            <div className="space-y-2">
              <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">Production</span>
                  {activeEnvironment === 'production' && (
                    <Badge variant="default" size="xs">
                      Active
                    </Badge>
                  )}
                  <StatusBadge
                    status={
                      readiness.production.ready ? 'connected' : 'disconnected'
                    }
                    label={
                      readiness.production.ready
                        ? 'Pair Connected'
                        : 'Incomplete Pair'
                    }
                    size="sm"
                  />
                </div>
                {activeEnvironment === 'production' ? (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <CheckCircle2 className="text-success size-3.5 shrink-0" />
                    <span>Selected workspace</span>
                  </div>
                ) : !readiness.production.ready ? (
                  /* SINGLE primary action button: only Configure Production */
                  <Button
                    size="sm"
                    onClick={onGoToConnections}
                    className="h-7 gap-1 text-xs"
                  >
                    Configure Production
                    <ExternalLink className="size-3" />
                  </Button>
                ) : canActivate ? (
                  <Button
                    size="sm"
                    onClick={() => void requestActivation('production')}
                    disabled={activating || previewing}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {activating || previewing ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <ArrowRight className="size-3" />
                    )}
                    {previewing ? 'Reviewing…' : activating ? 'Activating…' : 'Switch to Production'}
                  </Button>
                ) : (
                  <Badge variant="secondary" size="xs">
                    Admin access required
                  </Badge>
                )}
              </div>

              {/* Side-by-side platform connection items */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <ConnectionItem
                  label="Source platform"
                  platformId={project.sourcePlatformId}
                  connection={readiness.production.source}
                />
                <ConnectionItem
                  label="Destination platform"
                  platformId={project.destPlatformId}
                  connection={readiness.production.destination}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
