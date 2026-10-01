import { useEffect, useRef, useState, type ReactNode } from 'react';

import ConnectionsReadyDialog from './ConnectionsReadyDialog';
import PlatformCard from './PlatformCard';
import SourcePlatformPicker from './SourcePlatformPicker';

import { connectionsApi } from '@/api/connections';
import ConnectionEnvDropdown from '@/components/connections/ConnectionEnvToggle';
import { PLATFORM_META } from '@/components/connections/platformMeta';
import HeadingPair from '@/components/shared/HeadingPair';
import CredentialsModal from '@/components/connections/CredentialsModal';
import type { ExtConnection, ConnectionPayload } from '@/components/connections/types';
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
  onContinue?: () => void;
  className?: string;
}

function verificationErrorKey(projectId: string, conn: ExtConnection): string {
  return `synkazo:connection-verification-error:${projectId}:${conn.environment ?? 'production'}:${conn.connectionType}:${conn.platformId}`;
}

function borderFeedbackKey(projectId: string, conn: ExtConnection): string {
  return `${projectId}:${conn.environment ?? 'production'}:${conn.connectionType}:${conn.platformId}`;
}

function readVerificationError(projectId: string, conn: ExtConnection): string | null {
  try {
    return sessionStorage.getItem(verificationErrorKey(projectId, conn));
  } catch {
    return null;
  }
}

function saveVerificationError(projectId: string, conn: ExtConnection, message: string) {
  try {
    sessionStorage.setItem(verificationErrorKey(projectId, conn), message);
  } catch {
    // The inline error still works when browser storage is unavailable.
  }
}

function clearVerificationError(projectId: string, conn: ExtConnection) {
  try {
    sessionStorage.removeItem(verificationErrorKey(projectId, conn));
  } catch {
    // Storage is optional; connection status remains authoritative.
  }
}

interface ConnectionStepProps {
  number: number;
  title: string;
  description: string;
  complete: boolean;
  hasConnection: boolean;
  hasVerificationError?: boolean;
  showSuccessBorder?: boolean;
  nextRequired: boolean;
  last?: boolean;
  isTesting?: boolean;
  onFix?: () => void;
  children: ReactNode;
}

function ConnectionStep({
  number,
  title,
  description,
  complete,
  hasConnection,
  hasVerificationError = false,
  showSuccessBorder = false,
  nextRequired,
  last = false,
  isTesting = false,
  onFix,
  children,
}: ConnectionStepProps) {
  const isError = !isTesting && (hasVerificationError || (!complete && hasConnection));
  const borderState = isTesting
    ? 'testing'
    : isError
      ? 'error'
      : showSuccessBorder
        ? 'success'
        : complete
          ? 'connected'
          : 'pending';
  const status = isTesting
    ? 'in_progress'
    : isError
      ? 'error'
      : complete
        ? 'connected'
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
        surface="inner"
        data-connection-state={isTesting ? 'testing' : isError ? 'error' : complete ? 'connected' : 'pending'}
        data-border-state={borderState}
        data-testing={isTesting ? 'true' : undefined}
        className={cn(
          'relative gap-0 border py-0 overflow-hidden transition-all duration-300',
          borderState === 'testing' &&
            'border-primary/30 shadow-lg shadow-primary/5',
          borderState === 'error' &&
            'border-destructive/70 shadow-sm shadow-destructive/10',
          borderState === 'success' &&
            'border-success shadow-sm shadow-success/15',
          borderState === 'connected' && 'border-primary/20',
          borderState === 'pending' && 'border-dashed border-border/80',
        )}
      >
        {isTesting && <BorderBeam />}
        <div className="flex flex-col justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <HeadingPair level="h3" visualLevel="card" title={title} subtitle={description} />
          <StatusBadge
            status={isTesting ? 'in_progress' : status}
            action={
              !isTesting && isError && onFix
                ? { label: 'Fix', onClick: onFix }
                : undefined
            }
            size="sm"
          />
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
  onContinue,
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
    refreshConnections,
    activeConn,
    showManualModal,
    handleOAuth,
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
  const [successBorders, setSuccessBorders] = useState<Record<string, boolean>>({});
  const [verificationErrors, setVerificationErrors] = useState<Record<string, boolean>>({});
  const [cachedForms, setCachedForms] = useState<Record<string, Record<string, string>>>({});
  const [showReadyDialog, setShowReadyDialog] = useState(false);
  const successTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => () => {
    Object.values(successTimers.current).forEach(clearTimeout);
  }, []);

  const showSuccessFor = (conn: ExtConnection) => {
    const key = borderFeedbackKey(projectId, conn);
    clearTimeout(successTimers.current[key]);
    setSuccessBorders((current) => ({ ...current, [key]: true }));
    setVerificationErrors((current) => ({ ...current, [key]: false }));
    successTimers.current[key] = setTimeout(() => {
      setSuccessBorders((current) => ({ ...current, [key]: false }));
      delete successTimers.current[key];
    }, 3000);
  };

  const showErrorFor = (conn: ExtConnection, message: string) => {
    saveVerificationError(projectId, conn, message);
    setVerificationErrors((current) => ({
      ...current,
      [borderFeedbackKey(projectId, conn)]: true,
    }));
  };

  const handleConnectionUpdated = (
    conn: ExtConnection,
    updated: ExtConnection | null,
  ) => {
    if (!updated || updated.status === 'connected') {
      clearVerificationError(projectId, conn);
    }
    if (updated?.status === 'connected') showSuccessFor(conn);
    if (!updated) {
      const key = borderFeedbackKey(projectId, conn);
      clearTimeout(successTimers.current[key]);
      delete successTimers.current[key];
      setSuccessBorders((current) => ({ ...current, [key]: false }));
      setVerificationErrors((current) => ({
        ...current,
        [key]: false,
      }));
    }
    handleRowUpdated(updated);
  };

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
  const sourceSlot = sourcePlatformId
    ? sourceConn ?? makeSlotConn(sourcePlatformId, 'source')
    : null;
  const destinationSlot = destPlatformId
    ? destConn ?? makeSlotConn(destPlatformId, 'destination')
    : null;
  const sourceError = sourceSlot
    ? verificationErrors[borderFeedbackKey(projectId, sourceSlot)] ||
      readVerificationError(projectId, sourceSlot)
    : null;
  const destinationError = destinationSlot
    ? verificationErrors[borderFeedbackKey(projectId, destinationSlot)] ||
      readVerificationError(projectId, destinationSlot)
    : null;
  const nextRequired = !sourceComplete
    ? 'source'
    : !destinationComplete
      ? 'destination'
      : null;

  let boardDescription =
    'Connect the source first, then the destination to enable data sync.';
  if (sourceComplete && destinationComplete) {
    boardDescription =
      'Manage credentials and connection health for this environment.';
  } else if (sourceComplete) {
    boardDescription =
      'Source connected. Connect your destination to enable data sync.';
  } else if (destinationComplete) {
    boardDescription =
      'Destination connected. Connect your source to enable data sync.';
  }

  const handleSubmitCredentials = async (
    conn: ExtConnection,
    credentials: Record<string, string>,
    existingConnId?: string,
  ) => {
    const key = borderFeedbackKey(projectId, conn);
    setCachedForms((prev) => ({ ...prev, [key]: credentials }));
    clearVerificationError(projectId, conn);
    setVerificationErrors((current) => ({ ...current, [key]: false }));
    resetModals();

    const isSource = conn.connectionType === 'source';
    if (isSource) {
      setTestingSource(true);
    } else {
      setTestingDest(true);
    }

    try {
      let connId = existingConnId || conn.id;
      const payload: ConnectionPayload = {
        credentials,
        status: 'disconnected',
      };

      if (connId) {
        await connectionsApi.updateConnection(
          projectId,
          connId,
          payload as Partial<Connection>,
        );
      } else {
        const saved = await connectionsApi.createConnection(projectId, {
          ...payload,
          platformId: conn.platformId,
          connectionType: conn.connectionType,
          environment: conn.environment ?? activeEnv,
        } as Partial<Connection>);
        connId = saved?.id;
      }

      if (!connId) {
        throw new Error('Connection could not be saved. Please try again.');
      }

      const result = await connectionsApi.testConnection(projectId, connId);

      if (result?.success) {
        clearVerificationError(projectId, conn);
        await refreshConnections();
        await onSaved?.();
        showSuccessFor(conn);

        const isPairComplete =
          (isSource && destinationComplete) || (!isSource && sourceComplete);
        if (isPairComplete) {
          setShowReadyDialog(true);
        }
      } else {
        const errorMsg =
          result?.message ||
          'Invalid credentials — please check the values and try again.';
        showErrorFor(conn, errorMsg);
        await refreshConnections();

        openConnect({ ...conn, id: connId });
      }
    } catch (err) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      const errorMsg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to save credentials. Please check your values and try again.';
      showErrorFor(conn, errorMsg);
      await refreshConnections();

      openConnect(conn);
    } finally {
      if (isSource) {
        setTestingSource(false);
      } else {
        setTestingDest(false);
      }
    }
  };

  return (
    <>
      <Card className={cn('w-full', className)}>
      <CardHeader visualLevel="section" className="gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>Connections</CardTitle>
            <StatusBadge
              status={activeEnv === 'production' ? 'production' : 'sandbox'}
              label={
                activeEnv === 'production'
                  ? 'Production (Live)'
                  : 'Sandbox (Test Mode)'
              }
              title={
                activeEnv === 'production'
                  ? 'Live Production Sync active'
                  : 'Operating in Sandbox — Live customer data is not affected'
              }
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

        <CardContent className="space-y-6 pt-2">
          <div className="space-y-5">
            <ConnectionStep
              number={1}
              title="Connect source"
              description="First, connect the platform your records come from."
              complete={sourceComplete}
              hasConnection={Boolean(sourceConn)}
              hasVerificationError={Boolean(sourceError)}
              showSuccessBorder={Boolean(
                sourceSlot && successBorders[borderFeedbackKey(projectId, sourceSlot)],
              )}
              nextRequired={nextRequired === 'source'}
              isTesting={testingSource}
              onFix={sourceSlot ? () => openConnect(sourceSlot) : undefined}
            >
              {sourceSlot ? (
                <PlatformCard
                  conn={sourceSlot}
                  onConnect={openConnect}
                  onUpdated={(updated) =>
                    handleConnectionUpdated(sourceSlot, updated)
                  }
                  onTestError={(message) => showErrorFor(sourceSlot, message)}
                  nextRequired={nextRequired === 'source'}
                  isTesting={testingSource}
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
              hasVerificationError={Boolean(destinationError)}
              showSuccessBorder={Boolean(
                destinationSlot && successBorders[borderFeedbackKey(projectId, destinationSlot)],
              )}
              nextRequired={nextRequired === 'destination'}
              isTesting={testingDest}
              onFix={destinationSlot ? () => openConnect(destinationSlot) : undefined}
              last
            >
              {destinationSlot ? (
                <PlatformCard
                  conn={destinationSlot}
                  onConnect={openConnect}
                  onUpdated={(updated) =>
                    handleConnectionUpdated(destinationSlot, updated)
                  }
                  onTestError={(message) => showErrorFor(destinationSlot, message)}
                  nextRequired={nextRequired === 'destination'}
                  connectDisabled={!sourceComplete && !destConn}
                  isTesting={testingDest}
                  onTestingChange={setTestingDest}
                />
              ) : (
                <div className="text-muted-foreground px-4 py-3 text-sm">
                  Choose a destination platform before connecting credentials.
                </div>
              )}
            </ConnectionStep>
          </div>

        </CardContent>
      </Card>

      {showManualModal && activeConn && (
        <CredentialsModal
          projectId={projectId}
          conn={activeConn}
          syncMode={syncMode}
          onOAuth={
            activeConn.platformId === 'hubspot' ? handleOAuth : undefined
          }
          initialForm={cachedForms[borderFeedbackKey(projectId, activeConn)]}
          onSubmitCredentials={(creds, existingId) =>
            handleSubmitCredentials(activeConn, creds, existingId)
          }
          onSaved={async () => {
            clearVerificationError(projectId, activeConn);
            await refreshConnections();
            await onSaved?.();
            showSuccessFor(activeConn);
          }}
          onClose={resetModals}
          onContinue={onContinue}
          onVerificationError={(message) => {
            showErrorFor(activeConn, message);
            void refreshConnections();
          }}
          onTestingChange={
            activeConn.connectionType === 'source' ? setTestingSource : setTestingDest
          }
          initialError={readVerificationError(projectId, activeConn)}
          willCompleteBoth={false}
        />
      )}

      <ConnectionsReadyDialog
        open={showReadyDialog}
        onOpenChange={setShowReadyDialog}
        sourcePlatformId={sourceSlot?.platformId ?? sourcePlatformId}
        sourcePlatformLabel={
          PLATFORM_META[sourceSlot?.platformId ?? sourcePlatformId ?? '']?.label ??
          'Source'
        }
        destPlatformId={destinationSlot?.platformId ?? destPlatformId}
        destPlatformLabel={
          PLATFORM_META[
            destinationSlot?.platformId ?? destPlatformId ?? ''
          ]?.label ?? 'Destination'
        }
        environment={activeEnv}
        onDismiss={() => setShowReadyDialog(false)}
        onContinue={() => {
          setShowReadyDialog(false);
          onContinue?.();
        }}
      />
    </>
  );
}
