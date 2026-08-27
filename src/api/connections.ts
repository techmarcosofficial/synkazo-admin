import apiClient from './apiClient';

import type {
  Connection,
  ConnectionPermissions,
  DiscoveryObject,
  DiscoveryProperty,
  HubSpotEnvironment,
  PaginatedResponse,
  WebhookEvent,
  WebhookSubscription,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
const p = (projectId: string) => `/projects/${projectId}/connections`;

interface GetPropertiesOptions {
  refresh?: boolean;
  environment?: HubSpotEnvironment;
}

export const connectionsApi = {
  listAllConnections: (): Promise<Connection[]> =>
    apiClient.get('/connections').then(d),

  listProjectConnections: (projectId: string): Promise<Connection[]> =>
    apiClient.get(p(projectId)).then(d),
  getConnection: (projectId: string, connId: string): Promise<Connection> =>
    apiClient.get(`${p(projectId)}/${connId}`).then(d),
  getCredentialsPreview: (
    projectId: string,
    connId: string,
  ): Promise<Record<string, string>> =>
    apiClient.get(`${p(projectId)}/${connId}/credentials-preview`).then(d),
  getConnectionPermissions: (
    projectId: string,
    connId: string,
  ): Promise<ConnectionPermissions> =>
    apiClient.get(`${p(projectId)}/${connId}/permissions`).then(d),
  listWebhookEvents: (
    projectId: string,
    connId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResponse<WebhookEvent>> =>
    apiClient
      .get(`${p(projectId)}/${connId}/webhooks/events`, {
        params: { page, limit },
      })
      .then((r) => r.data),
  listWebhookSubscriptions: (
    projectId: string,
    connId: string,
  ): Promise<WebhookSubscription[]> =>
    apiClient.get(`${p(projectId)}/${connId}/webhooks`).then(d),
  forceResyncWebhooks: (
    projectId: string,
    connId: string,
  ): Promise<WebhookSubscription[]> =>
    apiClient.post(`${p(projectId)}/${connId}/webhooks/reconcile`).then(d),
  deleteWebhookSubscription: (
    projectId: string,
    connId: string,
    subscriptionId: string,
  ): Promise<void> =>
    apiClient
      .delete(`${p(projectId)}/${connId}/webhooks/${subscriptionId}`)
      .then(d),
  createConnection: (
    projectId: string,
    data: Partial<Connection>,
  ): Promise<Connection> => apiClient.post(p(projectId), data).then(d),
  updateConnection: (
    projectId: string,
    connId: string,
    data: Partial<Connection>,
  ): Promise<Connection> =>
    apiClient.patch(`${p(projectId)}/${connId}`, data).then(d),
  deleteConnection: (projectId: string, connId: string): Promise<void> =>
    apiClient.delete(`${p(projectId)}/${connId}`).then(d),
  testConnection: (
    projectId: string,
    connId: string,
  ): Promise<{ success: boolean; message?: string }> =>
    apiClient.post(`${p(projectId)}/${connId}/test`).then(d),
  getConnectionProperties: (
    projectId: string,
    connId: string,
    objectType: string,
  ): Promise<DiscoveryProperty[]> =>
    apiClient
      .get(`${p(projectId)}/${connId}/properties`, { params: { objectType } })
      .then(d),

  activateEnvironment: (
    projectId: string,
    environment: HubSpotEnvironment,
  ): Promise<unknown> =>
    apiClient
      .post(`/projects/${projectId}/connections/activate-environment`, {
        environment,
      })
      .then(d),

  getHubSpotOAuthUrl: (
    projectId: string,
    connectionType: 'source' | 'destination' = 'destination',
    environment: HubSpotEnvironment = 'production',
  ): Promise<string> =>
    apiClient
      .get('/connections/hubspot/oauth', {
        params: { projectId, connectionType, environment },
      })
      .then((r) => d(r).redirectUrl),

  getObjects: (
    projectId: string,
    platform: string,
    environment?: HubSpotEnvironment,
  ): Promise<DiscoveryObject[]> =>
    apiClient
      .get(`/projects/${projectId}/discovery/${platform}/objects`, {
        params: environment ? { environment } : {},
      })
      .then((r) => r.data.data ?? []),

  getProperties: (
    projectId: string,
    platform: string,
    objectType: string,
    { refresh = false, environment }: GetPropertiesOptions = {},
  ): Promise<DiscoveryProperty[]> =>
    apiClient
      .get(
        `/projects/${projectId}/discovery/${platform}/${objectType}/properties`,
        {
          params: {
            ...(refresh ? { refresh: 'true' } : {}),
            ...(environment ? { environment } : {}),
          },
        },
      )
      .then((r) => r.data.data?.properties ?? []),

  createHubspotCustomObject: (
    projectId: string,
    schema: Record<string, unknown>,
  ): Promise<unknown> =>
    apiClient
      .post(`/projects/${projectId}/discovery/hubspot/custom-objects`, schema)
      .then(d),

  createHubspotProperty: (
    projectId: string,
    objectType: string,
    field: Record<string, unknown>,
  ): Promise<unknown> =>
    apiClient
      .post(`/projects/${projectId}/discovery/hubspot/properties`, {
        objectType,
        ...field,
      })
      .then(d),

  getSTProjectStatuses: (
    projectId: string,
  ): Promise<Array<{ id: string; label: string }>> =>
    apiClient
      .get(`/projects/${projectId}/discovery/servicetitan/project-statuses`)
      .then((r) => r.data.data ?? []),

  getHubSpotPipelinesForProject: (
    projectId: string,
    objectType = '0-970',
  ): Promise<unknown[]> =>
    apiClient
      .get(`/projects/${projectId}/discovery/hubspot/pipelines`, {
        params: { objectType },
      })
      .then((r) => r.data.data ?? []),
};
