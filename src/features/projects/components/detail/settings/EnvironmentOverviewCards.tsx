import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

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
  onActivate: (environment: ProjectEnvironment) => Promise<void>;
  onGoToConnections: () => void;
}) {
  const { confirm } = useConfirmDialog();
  const { hasRole } = useSynkazoAuth();
  const canActivate = hasRole('org_admin');

  const readiness = {
    sandbox: environmentReadiness(connections, 'sandbox'),
    production: environmentReadiness(connections, 'production'),
  };

  const requestActivation = (env: ProjectEnvironment) => {
    clearActivationError();
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
            Runs already queued or running keep the environment captured when
            they were queued. Newly queued syncs use {targetLabel}.
          </p>
          <p className="text-muted-foreground">
            This does not copy jobs, mappings, objects, or properties between
            environments.
          </p>
        </div>
      ),
      confirmLabel: activeEnvironment
        ? `Switch to ${targetLabel}`
        : `Activate ${targetLabel}`,
      onConfirm: () => onActivate(env),
    });
  };

  return (
    <div className="space-y-4">
      {activationError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertDescription>{activationError}</AlertDescription>
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
                      : 'Sandbox (Test Mode)'
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
                    <span>Syncs running</span>
                  </div>
                ) : readiness.sandbox.ready ? (
                  canActivate ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestActivation('sandbox')}
                      disabled={activating}
                      className="h-7 gap-1 text-xs"
                    >
                      {activating ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <ArrowRight className="size-3" />
                      )}
                      {activating ? 'Activating…' : 'Switch to Sandbox'}
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
                    <span>Syncs running</span>
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
                    onClick={() => requestActivation('production')}
                    disabled={activating}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {activating ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <ArrowRight className="size-3" />
                    )}
                    {activating ? 'Activating…' : 'Switch to Production'}
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
