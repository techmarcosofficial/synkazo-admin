import { useState } from 'react';

import ConnectionHelp from './ConnectionHelp';
import FlowConnector from './FlowConnector';
import PlatformCard from './PlatformCard';
import SourcePlatformPicker from './SourcePlatformPicker';
import { type ConnectionsViewMode } from './ViewToggle';

import ConnectionEnvDropdown from '@/components/connections/ConnectionEnvToggle';
import ConnectionListView from '@/components/connections/ConnectionListView';
import ConnectMethodModal from '@/components/connections/ConnectMethodModal';
import CredentialsModal from '@/components/connections/CredentialsModal';
import { useConnectionsManager } from '@/components/connections/useConnectionsManager';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Connection } from '@/types';
interface ConnectionBoardProps {
  projectId: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
  /** Project sync-mode gate. When "two_way", HubSpot must be connected via OAuth — the Manual (API-token) method is disabled since webhooks need OAuth. Null = unrestricted (both methods offered). */
  syncMode?: 'one_way' | 'two_way' | null;
  onConnectionsChange?: ((conns: Connection[]) => void) | null;
  projectActiveEnv?: string | null;
  reloadKey?: number;
  /** Hides the Sandbox/Production environment switcher — used when embedding in the guided setup wizard, which always operates against sandbox. */
  hideEnvironmentToggle?: boolean;
  className?: string;
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
  className,
}: ConnectionBoardProps) {
  const [view, setView] = useState<ConnectionsViewMode>('board');

  const {
    loading,
    activeEnv,
    setActiveEnv,
    realConnections,
    missingSlots,
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

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connections Header part */}
      {view === 'list' ? (
        <ConnectionListView
          realConnections={realConnections}
          missingSlots={missingSlots}
          activeEnv={activeEnv}
          sourcePlatformId={sourcePlatformId}
          destPlatformId={destPlatformId}
          openConnect={openConnect}
          handleRowUpdated={handleRowUpdated}
          makeSlotConn={makeSlotConn}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Connections</CardTitle>
              {/* Env badge */}
              {activeEnv && (
                <Badge className="bg-muted text-muted-foreground">
                  <span
                    className={cn(
                      'size-2 rounded-full bg-current',
                      activeEnv === 'sandbox' ? 'bg-warning' : 'bg-success',
                    )}
                  />
                  {activeEnv}
                </Badge>
              )}
            </div>
            <CardDescription>
              Connect your platforms to enable data sync
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
          <CardContent className={cn('flex items-center p-12', className)}>
            {/* Source — until a source platform is chosen (fresh HubSpot
                Marketplace project) show the one-time picker in its place. */}
            <div className="h-full w-full max-w-140">
              {sourcePlatformId ? (
                <PlatformCard
                  conn={sourceConn ?? makeSlotConn(sourcePlatformId, 'source')}
                  onConnect={openConnect}
                  onUpdated={handleRowUpdated}
                />
              ) : (
                <SourcePlatformPicker projectId={projectId} />
              )}
            </div>

            {/* Flow */}
            <div className="relative flex w-full items-center justify-center self-center px-4 py-2">
              <span className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-t border-dashed" />
              <span className="dot bg-primary absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
              <span className="dot bg-primary absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full" />
              <FlowConnector />
            </div>

            {/* Destination */}
            <div className="w-full max-w-110">
              {destPlatformId && (
                <PlatformCard
                  conn={destConn ?? makeSlotConn(destPlatformId, 'destination')}
                  onConnect={openConnect}
                  onUpdated={handleRowUpdated}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ConnectionHelp />

      {showMethodModal && activeConn && (
        <ConnectMethodModal
          platform={activeConn.platformId}
          onManual={handleManual}
          onOAuth={
            activeConn.platformId === 'hubspot' ? handleOAuth : undefined
          }
          // Two-way projects require OAuth for HubSpot (webhooks can't run on a
          // Private App token). Only gate HubSpot — source platforms have no
          // OAuth path, so disabling their manual option would strand the user.
          manualDisabled={
            activeConn.platformId === 'hubspot' && syncMode === 'two_way'
          }
          onClose={resetModals}
        />
      )}

      {showManualModal && activeConn && (
        <CredentialsModal
          projectId={projectId}
          conn={activeConn}
          onSaved={handleSaved}
          onClose={resetModals}
        />
      )}
    </div>
  );
}
