import { PlugZap } from 'lucide-react';

import AddConnectionCard from './AddConnectionCard';
import ConnectionRow from './ConnectionRow';
import { PLATFORM_META } from './platformMeta';
import type { ExtConnection, MissingSlot } from './types';

import ListStack from '@/components/shared/list/ListStack';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ConnectionListViewProps {
  realConnections: ExtConnection[];
  missingSlots: MissingSlot[];
  activeEnv: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
  openConnect: (conn: ExtConnection) => void;
  handleRowUpdated: (updated: ExtConnection | null) => void;
  makeSlotConn: (
    platformId: string,
    connectionType: 'source' | 'destination',
  ) => ExtConnection;
}

export default function ConnectionListView({
  realConnections,
  missingSlots,
  activeEnv,
  sourcePlatformId,
  destPlatformId,
  openConnect,
  handleRowUpdated,
  makeSlotConn,
}: ConnectionListViewProps) {
  return (
    <ListStack>
      {realConnections.map((conn) => (
        <ConnectionRow
          key={conn.id}
          conn={conn}
          onConnect={openConnect}
          onUpdated={handleRowUpdated}
        />
      ))}

      {missingSlots.map((slot) => (
        <AddConnectionCard
          key={`${slot.platformId}-${slot.connectionType}`}
          platformId={slot.platformId}
          connectionType={slot.connectionType}
          environment={activeEnv}
          onConnect={() =>
            openConnect(makeSlotConn(slot.platformId, slot.connectionType))
          }
        />
      ))}

      {realConnections.length === 0 && missingSlots.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              No connections for this environment. Add a platform to start
              syncing.
            </p>
            <div className="flex items-center justify-center gap-3">
              {sourcePlatformId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary"
                  onClick={() =>
                    openConnect(makeSlotConn(sourcePlatformId, 'source'))
                  }
                >
                  <PlugZap />{' '}
                  {PLATFORM_META[sourcePlatformId]?.label ?? sourcePlatformId}
                </Button>
              )}
              {destPlatformId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary"
                  onClick={() =>
                    openConnect(makeSlotConn(destPlatformId, 'destination'))
                  }
                >
                  <PlugZap />{' '}
                  {PLATFORM_META[destPlatformId]?.label ?? destPlatformId}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </ListStack>
  );
}
