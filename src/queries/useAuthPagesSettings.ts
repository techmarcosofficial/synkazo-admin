import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { authPagesSettingsApi, type AuthPagesSettings } from '@/api/auth-pages-settings';

export function useAuthPagesSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.authPagesSettings.detail,
    queryFn: authPagesSettingsApi.get,
  });
}

export function useEnableAuthPageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (page: 'login' | 'register') =>
      authPagesSettingsApi.enablePage(page),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.authPagesSettings.detail,
      });
    },
  });
}

export function useDisableAuthPageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (page: 'login' | 'register') =>
      authPagesSettingsApi.disablePage(page),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.authPagesSettings.detail,
      });
    },
  });
}
