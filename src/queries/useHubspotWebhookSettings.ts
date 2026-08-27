import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { hubspotWebhookSettingsApi } from '@/api/webhooks';

export function useHubspotWebhookSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.hubspotWebhookSettings.detail,
    queryFn: hubspotWebhookSettingsApi.get,
  });
}

export function useUpdateHubspotWebhookSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUrl: string) =>
      hubspotWebhookSettingsApi.update(targetUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.hubspotWebhookSettings.detail,
      });
    },
  });
}
