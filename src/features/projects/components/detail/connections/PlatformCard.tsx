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
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';

interface PlatformCardProps {
  conn: ExtConnection;
  onConnect: (conn: ExtConnection) => void;
  onUpdated: (updated: ExtConnection | null) => void;
}

export default function PlatformCard({
  conn,
  onConnect,
  onUpdated,
}: PlatformCardProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const envLabel = conn.environment === 'sandbox' ? 'Sandbox' : 'Production';
  const isSlot = !conn.id;

  const { confirm } = useConfirmDialog();
  const { testing, testResult, handleTest, handleDisconnect } =
    useConnectionTestAndDisconnect(conn, onUpdated);
  const [showPermissions, setShowPermissions] = useState(false);

  return (
    <Card
      className={cn(
        'border shadow-none',
        conn.status === 'error' && 'border-destructive/40',
      )}
    >
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <PlatformIcon
              platformId={conn.platformId}
              size={40}
              className={cn(isSlot && 'opacity-50')}
            />
            <div>
              <div
                className={cn(
                  'text-sm font-semibold',
                  isSlot && 'text-muted-foreground',
                )}
              >
                {meta.label}
              </div>
              {/* Description */}
              <div className={cn('text-xs', isSlot && 'text-muted-foreground')}>
                {isSlot ? 'Not connected' : envLabel}
              </div>
            </div>
          </div>
          {testing ? (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="size-3 animate-spin" /> Connecting
            </Badge>
          ) : (
            <StatusBadge
              status={isSlot ? 'disconnected' : conn.status}
              size="md"
            />
          )}
        </div>

        {testResult && (
          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
            {testResult.ok ? (
              <Check className="text-success size-3" />
            ) : (
              <AlertCircle className="text-destructive size-3" />
            )}
            {testResult.msg}
          </div>
        )}

        {isSlot ? (
          <Button
            variant="outline"
            className="border-primary text-primary w-full"
            onClick={() => onConnect(conn)}
          >
            <PlugZap /> Connect
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? <RefreshCw className="animate-spin" /> : <Wifi />}
              {conn.status === 'connected' ? 'Retest' : 'Test'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onConnect(conn)}>
              <Settings /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPermissions(true)}
            >
              <ShieldCheck /> Permissions
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() =>
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
              <Trash2 />
            </Button>
          </div>
        )}
      </CardContent>
      {!isSlot && (
        <ConnectionPermissionsDialog
          conn={conn}
          open={showPermissions}
          onOpenChange={setShowPermissions}
        />
      )}
    </Card>
  );
}
