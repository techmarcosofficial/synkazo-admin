import {
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  XCircle,
} from 'lucide-react';

import DisconnectImpactBody from './DisconnectImpactBody';
import { PLATFORM_META } from './platformMeta';
import type { ExtConnection } from './types';
import { useConnectionTestAndDisconnect } from './useConnectionTestAndDisconnect';

import { PlatformIcon } from '@/components/platform';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';

interface ConnectionRowProps {
  conn: ExtConnection;
  onConnect: (conn: ExtConnection) => void;
  onUpdated: (updated: ExtConnection | null) => void;
}

export default function ConnectionRow({
  conn,
  onConnect,
  onUpdated,
}: ConnectionRowProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const isConnected = conn.status === 'connected';

  const { confirm } = useConfirmDialog();
  const { testing, testResult, handleTest, handleDisconnect } =
    useConnectionTestAndDisconnect(conn, onUpdated);

  const envLabel = conn.environment === 'sandbox' ? 'Sandbox' : 'Production';

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlatformIcon platformId={conn.platformId} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{meta.label}</span>
                <Badge
                  className={cn(
                    conn.environment === 'sandbox'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success',
                  )}
                >
                  {envLabel}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs capitalize">
                {conn.connectionType} · {envLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="text-success size-3.5" />
            ) : (
              <XCircle className="text-destructive size-3.5" />
            )}
            <StatusBadge status={conn.status} size="sm" />
          </div>
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || !conn.id}
          >
            {testing ? (
              <>
                <RefreshCw className="animate-spin" /> Testing…
              </>
            ) : (
              <>
                <Wifi /> {isConnected ? 'Retest Connection' : 'Test Connection'}
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => onConnect(conn)}>
            <Settings /> Edit Credentials
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 ml-auto"
            onClick={() =>
              confirm({
                variant: 'danger',
                title: `Disconnect ${meta.label}?`,
                description: `${conn.environment === 'sandbox' ? 'Sandbox' : 'Production'} environment — this will remove the stored credentials.`,
                body: <DisconnectImpactBody projectId={conn.projectId} />,
                confirmLabel: 'Yes, Disconnect',
                onConfirm: handleDisconnect,
              })
            }
          >
            <Trash2 /> Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
