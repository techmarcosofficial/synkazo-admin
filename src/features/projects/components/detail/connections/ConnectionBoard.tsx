import { useState, type ReactNode } from 'react';

import PlatformCard from './PlatformCard';
import SourcePlatformPicker from './SourcePlatformPicker';

import ConnectionEnvDropdown from '@/components/connections/ConnectionEnvToggle';
import CredentialsModal from '@/components/connections/CredentialsModal';
import { useConnectionsManager } from '@/components/connections/useConnectionsManager';
import StatusBadge from '@/components/shared/StatusBadge';
import { BorderBeam } from '@/components/ui/border-beam';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Connection } from '@/types';

interface ConnectionBoardProps {
  projectId: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
  /** Two-way HubSpot connections require OAuth so webhooks can operate. */
  syncMode?: 'one_way' | 'two_way' | null;
  onConnectionsChange?: ((conns: Connection[]) => void) | null;
  projectActiveEnv?: string | null;
  reloadKey?: number;
  /** Used only when a parent flow has already fixed the credential environment. */
  hideEnvironmentToggle?: boolean;
  onSaved?: () => void;
  className?: string;
}

interface ConnectionStepProps {
  number: number;
  title: string;
  description: string;
  complete: boolean;
  hasConnection: boolean;
  nextRequired: boolean;
  last?: boolean;
  isTesting?: boolean;
  children: ReactNode;
}

function ConnectionStep({
  number,
  title,
  description,
  complete,
  hasConnection,
  nextRequired,
  last = false,
  isTesting = false,
  children,
}: ConnectionStepProps) {
  const status = complete
    ? 'connected'
    : hasConnection
      ? 'error'
      : nextRequired
        ? 'ready_to_connect'
        : 'awaiting_connection';

  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        {!last && (
          <span
            className={cn(
              'absolute top-9 -bottom-8 left-1/2 -translate-x-1/2 border-l-2 border-dashed',
              complete ? 'border-primary/50' : 'border-border',
            )}
            aria-hidden="true"
          />
        )}
        <span
          className="border-primary/40 absolute top-[1.125rem] -right-3 left-1/2 border-t"
          aria-hidden="true"
        />
        <span
          className={cn(
            'relative z-10 flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold',
            complete
              ? 'border-primary bg-primary text-primary-foreground'
              : nextRequired
                ? 'border-primary bg-primary/10 text-primary border-dashed'
                : 'border-border bg-card text-muted-foreground border-dashed',
          )}
          aria-label={`Step ${number}${complete ? ', complete' : ''}`}
        >
          {number}
        </span>
      </div>

      <Card
        data-connection-state={complete ? 'connected' : 'pending'}
        data-testing={isTesting ? 'true' : undefined}
        className={cn(
          'relative gap-0 border py-0 overflow-hidden transition-all duration-300',
          complete ? 'border-primary/20' : 'border-dashed',
          isTesting && 'border-primary/30 shadow-lg shadow-primary/5',
        )}
      >
        {isTesting && <BorderBeam />}
        <div className="flex flex-col justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {description}
            </p>
          </div>
          <StatusBadge status={isTesting ? 'in_progress' : status} size="sm" />
        </div>

        <Separator />
        <div>{children}</div>
      </Card>
    </div>
  );
}

export default function ConnectionBoard({
  projectId,
  sourcePlatformId,
  destPlatformId,
  syncMode = null,
  onConnectionsChange = null,
  projectActiveEnv = null,
  reloadKey = 0,
  hideEnvironmentToggle = false,
  onSaved,
  className,
}: ConnectionBoardProps) {
  const {
    loading,
    activeEnv,
    setActiveEnv,
    sourceConn,
    destConn,
    envHasAnyConnected,
    envFullyConnected,
    makeSlotConn,
    openConnect,
    handleRowUpdated,
    activeConn,
    showMethodModal,
    showManualModal,
    handleManual,
    handleOAuth,
    handleSaved,
    resetModals,
  } = useConnectionsManager({
    projectId,
    sourcePlatformId,
    destPlatformId,
    onConnectionsChange,
    reloadKey,
    projectActiveEnv,
  });

  const [testingSource, setTestingSource] = useState(false);
  const [testingDest, setTestingDest] = useState(false);

  if (loading) {
    return (
      <Card size="sm" className="w-full">
        <CardContent className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </CardContent>
      </Card>
    );
  }

  const sourceComplete = sourceConn?.status === 'connected';
  const destinationComplete = destConn?.status === 'connected';
  const nextRequired = !sourceComplete
    ? 'source'
    : !destinationComplete
      ? 'destination'
      : null;

  let boardDescription =
    'Connect the source first, then the destination to enable data sync.';
  if (sourceComplete && destinationComplete) {
    boardDescription =
      'Both platforms are connected and verified. Your project is active and ready for sync flows.';
  } else if (sourceComplete) {
    boardDescription =
      'Source connected. Connect your destination to enable data sync.';
  } else if (destinationComplete) {
    boardDescription =
      'Destination connected. Connect your source to enable data sync.';
  }

  return (
    <>
      <Card size="sm" className="w-full">
        <CardHeader className="gap-1">
          <div className="flex items-center gap-2">
            <CardTitle className="font-semibold">Connections</CardTitle>
            <StatusBadge
              status={activeEnv === 'production' ? 'production' : 'sandbox'}
              size="sm"
            />
          </div>
          <CardDescription>
            {boardDescription}
          </CardDescription>
          {!hideEnvironmentToggle && (
            <CardAction>
              <ConnectionEnvDropdown
                activeEnv={activeEnv}
                onChange={setActiveEnv}
                projectActiveEnv={projectActiveEnv}
                envHasAnyConnected={envHasAnyConnected}
                envFullyConnected={envFullyConnected}
              />
            </CardAction>
          )}
        </CardHeader>
      </Card>
      <div className={cn('space-y-5', className)}>
        <ConnectionStep
          number={1}
          title="Connect source"
          description="First, connect the platform your records come from."
          complete={sourceComplete}
          hasConnection={Boolean(sourceConn)}
          nextRequired={nextRequired === 'source'}
          isTesting={testingSource}
        >
          {sourcePlatformId ? (
            <PlatformCard
              conn={sourceConn ?? makeSlotConn(sourcePlatformId, 'source')}
              onConnect={openConnect}
              onUpdated={handleRowUpdated}
              nextRequired={nextRequired === 'source'}
              onTestingChange={setTestingSource}
            />
          ) : (
            <SourcePlatformPicker projectId={projectId} />
          )}
        </ConnectionStep>

        <ConnectionStep
          number={2}
          title="Connect destination"
          description="Then, connect the platform your records will sync to."
          complete={destinationComplete}
          hasConnection={Boolean(destConn)}
          nextRequired={nextRequired === 'destination'}
          isTesting={testingDest}
          last
        >
          {destPlatformId ? (
            <PlatformCard
              conn={destConn ?? makeSlotConn(destPlatformId, 'destination')}
              onConnect={openConnect}
              onUpdated={handleRowUpdated}
              nextRequired={nextRequired === 'destination'}
              connectDisabled={!sourceComplete && !destConn}
              onTestingChange={setTestingDest}
            />
          ) : (
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Choose a destination platform before connecting credentials.
            </div>
          )}
        </ConnectionStep>
      </div>

      {showManualModal && activeConn && (
        <CredentialsModal
          projectId={projectId}
          conn={activeConn}
          syncMode={syncMode}
          onOAuth={
            activeConn.platformId === 'hubspot' ? handleOAuth : undefined
          }
          onSaved={() => {
            handleSaved();
            onSaved?.();
          }}
          onClose={resetModals}
          willCompleteBoth={
            (activeConn.connectionType === 'source' && destinationComplete) ||
            (activeConn.connectionType === 'destination' && sourceComplete)
          }
        />
      )}
    </>
  );
}
