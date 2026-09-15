import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers3,
  RefreshCw,
} from 'lucide-react';

import { PlatformIcon } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type {
  ConnectionExt,
  ProjectExt,
} from '@/features/projects/hooks/useProjectDetail';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
import type { ProjectEnvironment } from '@/types';

const ENVIRONMENTS: Array<{
  id: ProjectEnvironment;
  label: string;
  description: string;
}> = [
  {
    id: 'sandbox',
    label: 'Sandbox',
    description: 'Use test portals and credentials for validation.',
  },
  {
    id: 'production',
    label: 'Production',
    description: 'Use live portals and credentials for operational syncs.',
  },
];

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

function ConnectionReadinessRow({
  label,
  platformId,
  connection,
}: {
  label: string;
  platformId: string | null | undefined;
  connection: ConnectionExt | undefined;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        {platformId ? (
          <PlatformIcon
            platformId={platformId}
            variant="icon-text"
            size="sm"
            className="mt-1 max-w-full min-w-0"
          />
        ) : (
          <p className="mt-1 text-sm font-medium">Not selected</p>
        )}
        {connection?.accountName && (
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {connection.accountName}
          </p>
        )}
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
  const readiness = Object.fromEntries(
    ENVIRONMENTS.map((environment) => [
      environment.id,
      environmentReadiness(connections, environment.id),
    ]),
  ) as Record<ProjectEnvironment, ReturnType<typeof environmentReadiness>>;

  const targetEnvironment: ProjectEnvironment = activeEnvironment
    ? activeEnvironment === 'sandbox'
      ? 'production'
      : 'sandbox'
    : readiness.sandbox.ready
      ? 'sandbox'
      : 'production';
  const targetLabel =
    targetEnvironment === 'sandbox' ? 'Sandbox' : 'Production';
  const currentLabel = activeEnvironment
    ? activeEnvironment === 'sandbox'
      ? 'Sandbox'
      : 'Production'
    : 'no active environment';
  const targetReady = readiness[targetEnvironment].ready;

  const requestActivation = () => {
    clearActivationError();
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
      onConfirm: () => onActivate(targetEnvironment),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Active sync environment</CardTitle>
              {activeEnvironment ? (
                <StatusBadge status={activeEnvironment} size="sm" />
              ) : (
                <Badge variant="outline">Not activated</Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Controls which verified connection pair new sync work uses.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {!targetReady && (
              <Button variant="outline" size="sm" onClick={onGoToConnections}>
                Configure {targetLabel}
                <ExternalLink />
              </Button>
            )}
            {canActivate ? (
              <Button
                size="sm"
                onClick={requestActivation}
                disabled={!targetReady || activating}
              >
                {activating ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  <ArrowRight />
                )}
                {activating
                  ? 'Activating…'
                  : `${activeEnvironment ? 'Switch to' : 'Activate'} ${targetLabel}`}
              </Button>
            ) : (
              <Badge variant="secondary">Admin access required</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activationError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{activationError}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Layers3 />
            <AlertDescription>
              Environment activation changes runtime routing only. Schema and
              configuration transfer is reviewed separately below.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 rounded-3xl p-4 text-sm">
            {activeEnvironment ? (
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="text-success size-4" />
                <span className="font-medium capitalize">
                  {activeEnvironment} is active
                </span>
                {project.environmentActivatedAt && (
                  <span className="text-muted-foreground">
                    · activated{' '}
                    {new Date(project.environmentActivatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Connect and verify a complete environment pair to activate it.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-base font-semibold">Environment readiness</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Both source and destination must be connected before an environment
          can become active.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ENVIRONMENTS.map((environment) => {
          const state = readiness[environment.id];
          const isActive = activeEnvironment === environment.id;
          return (
            <Card
              key={environment.id}
              className={cn(isActive && 'ring-primary/30 ring-2')}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{environment.label}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive && <Badge>Active</Badge>}
                    <StatusBadge
                      status={state.ready ? 'connected' : 'disconnected'}
                      size="sm"
                    />
                  </div>
                </div>
                <CardDescription>{environment.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConnectionReadinessRow
                  label="Source connection"
                  platformId={project.sourcePlatformId}
                  connection={state.source}
                />
                <div className="border-t" />
                <ConnectionReadinessRow
                  label="Destination connection"
                  platformId={project.destPlatformId}
                  connection={state.destination}
                />
                {!state.ready && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0"
                    onClick={onGoToConnections}
                  >
                    Complete connection setup
                    <ExternalLink />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
