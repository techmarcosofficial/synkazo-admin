import { createContext, useContext, type ReactNode } from 'react';
import { connectionsApi } from '@/api/connections';
import type { ExtConnection } from './types';

export type ConnectionAccessApi = Pick<
  typeof connectionsApi,
  | 'listProjectConnections'
  | 'getCredentialsPreview'
  | 'createConnection'
  | 'updateConnection'
  | 'testConnection'
  | 'getHubSpotOAuthUrl'
  | 'startHubSpotRescope'
  | 'getConnectionPermissions'
> & {
  forceResyncWebhooks?: typeof connectionsApi.forceResyncWebhooks;
  deleteConnection?: typeof connectionsApi.deleteConnection;
};

interface ConnectionAccess {
  api: ConnectionAccessApi;
  audience: 'tenant' | 'super_admin';
  onDisconnect?: (conn: ExtConnection, onRemoved: () => void) => void;
}

const ConnectionAccessContext = createContext<ConnectionAccess | null>(null);
const tenantAccess: ConnectionAccess = {
  api: connectionsApi,
  audience: 'tenant',
};

export function ConnectionAccessProvider({
  value,
  children,
}: {
  value: ConnectionAccess;
  children: ReactNode;
}) {
  return (
    <ConnectionAccessContext.Provider value={value}>
      {children}
    </ConnectionAccessContext.Provider>
  );
}

export function useConnectionAccess() {
  return useContext(ConnectionAccessContext) ?? tenantAccess;
}
