import apiClient from './apiClient';

import type { HubspotWebhookSettings } from '@/types';

const base = '/webhooks/hubspot/settings';

// Super-admin-only — HubSpot's webhooks-v3 API has no per-portal target URL,
// so this is one app-wide value shared by every connected portal. Unlike
// most endpoints, these two return their payload unwrapped (no
// {success,message,data} envelope) — matches the controller as written.
export const hubspotWebhookSettingsApi = {
  get: (): Promise<HubspotWebhookSettings> =>
    apiClient.get(base).then((r) => r.data),
  update: (targetUrl: string): Promise<{ success: boolean; message: string }> =>
    apiClient.post(base, { targetUrl }).then((r) => r.data),
};
