import {
  AlertCircle,
  Check,
  PlugZap,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';

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
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';

interface PlatformCardProps {
  conn: ExtConnection;
  onConnect: (conn: ExtConnection) => void;
  onUpdated: (updated: ExtConnection | null) => void;
  nextRequired?: boolean;
  connectDisabled?: boolean;
}

export default function PlatformCard({
  conn,
  onConnect,
  onUpdated,
  nextRequired = false,
  connectDisabled = false,
}: PlatformCardProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const envLabel = conn.environment === 'sandbox' ? 'Sandbox' : 'Production';
  const isSlot = !conn.id;

  const { confirm } = useConfirmDialog();
  const { testing, testResult, handleTest, handleDisconnect } =
    useConnectionTestAndDisconnect(conn, onUpdated);
  const [showPermissions, setShowPermissions] = useState(false);

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
              </p>
            </div>
          </div>

          {isSlot ? (
            <Button
              variant={nextRequired ? 'default' : 'secondary'}
              size="sm"
              className="w-full md:ml-auto md:w-auto"
              onClick={() => onConnect(conn)}
              disabled={connectDisabled}
            >
              <PlugZap />
              {connectDisabled
                ? 'Connect source first'
                : `Connect ${meta.label}`}
            </Button>
          ) : (
            <>
              <Separator className="md:hidden" />
              <Separator
                orientation="vertical"
                className="hidden h-7 data-vertical:self-center md:ml-auto md:block"
              />
              <div className="bg-muted/60 flex w-fit items-center rounded-3xl p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleTest}
                      disabled={testing}
                      aria-label={
                        testing
                          ? `Testing ${meta.label}`
                          : `${conn.status === 'connected' ? 'Retest' : 'Test'} ${meta.label}`
                      }
                    >
                      {testing ? (
                        <RefreshCw className="animate-spin" />
                      ) : (
                        <Wifi />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {testing
                      ? 'Testing connection'
                      : conn.status === 'connected'
                        ? 'Retest connection'
                        : 'Test connection'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onConnect(conn)}
                      aria-label={`Edit ${meta.label} connection`}
                    >
                      <Settings />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit connection</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPermissions(true)}
                      aria-label={`View ${meta.label} permissions`}
                    >
                      <ShieldCheck />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">View permissions</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      aria-label={`Disconnect ${meta.label}`}
                      onClick={() =>
                        confirm({
                          variant: 'danger',
                          title: `Disconnect ${meta.label}?`,
                          description: `${envLabel} environment — this will remove the stored credentials.`,
                          body: (
                            <DisconnectImpactBody projectId={conn.projectId} />
                          ),
                          confirmLabel: 'Yes, Disconnect',
                          onConfirm: handleDisconnect,
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Disconnect platform
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>

        {testResult && (
          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
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
