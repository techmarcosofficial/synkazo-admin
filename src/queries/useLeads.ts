import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { leadsApi } from '@/api/leads';
import { queryKeys } from '@/queries/queryKeys';
import type { LeadStatus } from '@/types/lead';

export function useLeadsQuery(
  page: number,
  limit: number,
  status?: LeadStatus,
  search?: string,
) {
  return useQuery({
    queryKey: queryKeys.leads.list(page, limit, status, search),
    queryFn: () => leadsApi.list({ page, limit, status, search }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      status?: LeadStatus;
      adminNotes?: string;
    }) => leadsApi.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all }),
  });
}

export function useLeadNotificationSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.leads.notificationSettings,
    queryFn: leadsApi.getNotificationSettings,
    enabled,
  });
}

export function useUpdateLeadNotificationSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (additionalRecipients: string[]) =>
      leadsApi.updateNotificationSettings(additionalRecipients),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.notificationSettings,
      }),
  });
}
