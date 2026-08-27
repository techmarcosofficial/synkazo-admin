import apiClient from './apiClient';

interface MarketplaceConnectPayload {
  projectId: string;
  token: string;
  credentials: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

interface HandoffTokens {
  accessToken: string;
  refreshToken: string;
}

export const marketplaceApi = {
  connectSource: (payload: MarketplaceConnectPayload): Promise<unknown> =>
    apiClient.post('/marketplace/hubspot/connect-source', payload).then(d),

  exchangeHandoff: (token: string): Promise<HandoffTokens> =>
    apiClient.post('/marketplace/hubspot/handoff', { token }).then(d),
};
