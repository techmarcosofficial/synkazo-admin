import apiClient from './apiClient';
import type { ConnectionAccessApi } from '@/components/connections/ConnectionAccessContext';
import type { Connection, ConnectionPermissions } from '@/types';
import type { SuperAdminProjectConnection } from '@/types/superAdmin';

const root = (org: string, project: string) =>
  `/super-admin/organisations/${org}/projects/${project}/connections`;
const connection = (
  projectId: string,
  row: SuperAdminProjectConnection,
): Connection => ({
  id: row.id,
  projectId,
  platformId: row.platformId as Connection['platformId'],
  connectionType: row.connectionType as Connection['connectionType'],
  environment: row.environment as Connection['environment'],
  status: row.status as Connection['status'],
  accountName: row.accountName ?? undefined,
  connectedAt: row.connectedAt ?? undefined,
  lastChecked: row.lastCheckedAt ?? undefined,
});

export const superAdminConnectionsApi = {
  disconnect: async (
    org: string,
    project: string,
    id: string,
    dto: { confirmation: string; reason: string },
  ) => {
    await apiClient.delete(`${root(org, project)}/${id}`, { data: dto });
  },
};

/** No tenant API fallback: every supplied action is explicitly org/project scoped. */
export function createSuperAdminConnectionAccess(
  org: string,
  projectId: string,
  onChanged: () => Promise<void>,
): ConnectionAccessApi {
  const path = root(org, projectId);
  const checkProject = (id: string) => {
    if (id !== projectId)
      throw new Error(
        'Connection project does not match the selected project.',
      );
  };
  return {
    listProjectConnections: async (id) => {
      checkProject(id);
      const result = await apiClient.get<{
        data: SuperAdminProjectConnection[];
      }>(path);
      return result.data.data.map((row) => connection(projectId, row));
    },
    createConnection: async (id, data) => {
      checkProject(id);
      const result = await apiClient.post<{
        data: SuperAdminProjectConnection;
      }>(path, {
        platformId: data.platformId,
        connectionType: data.connectionType,
        environment: data.environment,
        accountName: data.accountName,
        credentials: data.credentials,
      });
      await onChanged();
      return connection(projectId, result.data.data);
    },
    updateConnection: async (id, connId, data) => {
      checkProject(id);
      const result = await apiClient.patch<{
        data: SuperAdminProjectConnection;
      }>(`${path}/${connId}`, {
        credentials: data.credentials,
        accountName: data.accountName,
      });
      await onChanged();
      return connection(projectId, result.data.data);
    },
    getCredentialsPreview: async (id, connId) => {
      checkProject(id);
      return (
        await apiClient.get<{ data: Record<string, string> }>(
          `${path}/${connId}/credentials-preview`,
        )
      ).data.data;
    },
    getConnectionPermissions: async (id, connId) => {
      checkProject(id);
      return (
        await apiClient.get<{ data: ConnectionPermissions }>(
          `${path}/${connId}/permissions`,
        )
      ).data.data;
    },
    testConnection: async (id, connId) => {
      checkProject(id);
      const result = await apiClient.post<{
        data: { success: boolean; message: string };
      }>(`${path}/${connId}/test`);
      await onChanged();
      return result.data.data;
    },
    getHubSpotOAuthUrl: async (
      id,
      connectionType = 'destination',
      environment = 'production',
    ) => {
      checkProject(id);
      return (
        await apiClient.post<{ data: { redirectUrl: string } }>(
          `${path}/hubspot/oauth`,
          { connectionType, environment },
        )
      ).data.data.redirectUrl;
    },
    startHubSpotRescope: async (connId) =>
      (
        await apiClient.post<{ data: { redirectUrl: string } }>(
          `${path}/${connId}/hubspot/reconnect`,
        )
      ).data.data,
  };
}
