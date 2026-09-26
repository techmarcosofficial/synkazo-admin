import {
  AlertCircle,
  Check,
  PlugZap,
  RefreshCw,
  Settings,
  ShieldCheck,
  SquarePen,
  Trash2,
  Wifi,
  WifiSync,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import ConnectionPermissionsDialog from './ConnectionPermissionsDialog';

import DisconnectImpactBody from '@/components/connections/DisconnectImpactBody';
import { PLATFORM_META } from '@/components/connections/platformMeta';
import type { ExtConnection } from '@/components/connections/types';
import { useConnectionTestAndDisconnect } from '@/components/connections/useConnectionTestAndDisconnect';
import { PlatformIcon } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ActionTooltip } from '@/features/journey';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';

interface PlatformCardProps {
  conn: ExtConnection;
  onConnect: (conn: ExtConnection) => void;
  onUpdated: (updated: ExtConnection | null) => void;
  nextRequired?: boolean;
  connectDisabled?: boolean;
  onTestingChange?: (testing: boolean) => void;
}

export default function PlatformCard({
  conn,
  onConnect,
  onUpdated,
  nextRequired = false,
  connectDisabled = false,
  onTestingChange,
}: PlatformCardProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const envLabel = conn.environment === 'sandbox' ? 'Sandbox' : 'Production';
  const isSlot = !conn.id;
  const isConnected = conn.status === 'connected';
  const isError = !isSlot && !isConnected;

  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');
  const { confirm } = useConfirmDialog();
  const { testing, testResult, handleTest, handleDisconnect } =
    useConnectionTestAndDisconnect(conn, onUpdated);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    onTestingChange?.(testing);
  }, [testing, onTestingChange]);

  return (
    <>
      <div className="space-y-2 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <PlatformIcon
              platformId={conn.platformId}
              size={36}
              className={cn(isSlot && 'opacity-60')}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-sm font-semibold',
                  isSlot && 'text-muted-foreground',
                )}
              >
                {meta.label}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {envLabel}
                {!isSlot && conn.accountName ? ` · ${conn.accountName}` : ''}
                {isError ? ' · Action Required' : ''}
              </p>
            </div>
          </div>

          {isSlot ? (
            <ActionTooltip
              tooltip={
                !canManage
                  ? 'Organization Admin role required to configure platform credentials.'
                  : connectDisabled
                    ? 'Connect source platform first.'
                    : undefined
              }
            >
              <Button
                variant={nextRequired ? 'default' : 'secondary'}
                size="sm"
                className="w-full md:ml-auto md:w-auto"
                onClick={() => canManage && onConnect(conn)}
                disabled={!canManage || connectDisabled}
              >
                <PlugZap />
                {connectDisabled
                  ? 'Connect source first'
                  : `Connect ${meta.label}`}
              </Button>
            </ActionTooltip>
          ) : (
            <>
              <Separator className="md:hidden" />

              <Separator
                orientation="vertical"
                className="hidden h-7 data-vertical:self-center md:ml-auto md:block"
              />

              <div className="flex flex-wrap items-center gap-2">
                {isError ? (
                  <>
                    {/* Error State: Direct path to fix credentials */}
                    <ActionTooltip
                      tooltip={
                        !canManage
                          ? 'Organization Admin role required to update platform credentials.'
                          : undefined
                      }
                    >
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => canManage && onConnect(conn)}
                        disabled={!canManage}
                      >
                        <SquarePen className="size-3.5" />
                        Update Credentials
                      </Button>
                    </ActionTooltip>

                    {/* Remove failed setup */}
                    <ActionTooltip
                      tooltip={
                        !canManage
                          ? 'Organization Admin role required to remove platform credentials.'
                          : undefined
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!canManage}
                        onClick={() =>
                          canManage &&
                          confirm({
                            variant: 'danger',
                            title: `Remove ${meta.label} setup?`,
                            description: `${envLabel} environment — this will remove the stored credentials.`,
                            body: <DisconnectImpactBody projectId={conn.projectId} />,
                            confirmLabel: 'Yes, Remove',
                            onConfirm: handleDisconnect,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </ActionTooltip>
                  </>
                ) : (
                  <>
                    {/* Connected State: Management actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTest}
                      disabled={testing}
                      aria-label={
                        testing
                          ? `Testing ${meta.label}`
                          : `Retest ${meta.label}`
                      }
                    >
                      {testing ? (
                        <RefreshCw className="animate-spin size-3.5" />
                      ) : (
                        <WifiSync className="size-3.5" />
                      )}
                      {testing ? 'Testing...' : 'Retest'}
                    </Button>

                    <ActionTooltip
                      tooltip={
                        !canManage
                          ? 'Organization Admin role required to edit platform credentials.'
                          : undefined
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => canManage && onConnect(conn)}
                        disabled={!canManage}
                      >
                        <SquarePen className="size-3.5" />
                        Edit
                      </Button>
                    </ActionTooltip>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPermissions(true)}
                    >
                      <ShieldCheck className="size-3.5" />
                      {conn.platformId === 'hubspot'
                        ? 'Permissions & Rescoping'
                        : 'Permissions'}
                    </Button>

                    <ActionTooltip
                      tooltip={
                        !canManage
                          ? 'Organization Admin role required to disconnect platform integrations.'
                          : undefined
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!canManage}
                        onClick={() =>
                          canManage &&
                          confirm({
                            variant: 'danger',
                            title: `Disconnect ${meta.label}?`,
                            description: `${envLabel} environment — this will remove the stored credentials.`,
                            body: <DisconnectImpactBody projectId={conn.projectId} />,
                            confirmLabel: 'Yes, Disconnect',
                            onConfirm: handleDisconnect,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                        Disconnect
                      </Button>
                    </ActionTooltip>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {isError && (
          <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-2xl border border-destructive/20 px-3 py-1.5 text-xs">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Connection verification failed or credentials expired. Update credentials to restore sync.</span>
          </div>
        )}

        {testResult && (
          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs">
            {testResult.ok ? (
              <Check className="text-success size-3.5" />
            ) : (
              <AlertCircle className="text-destructive size-3.5" />
            )}
            {testResult.msg}
          </div>
        )}
      </div>

      {!isSlot && (
        <ConnectionPermissionsDialog
          conn={conn}
          open={showPermissions}
          onOpenChange={setShowPermissions}
        />
      )}
    </>
  );
}
