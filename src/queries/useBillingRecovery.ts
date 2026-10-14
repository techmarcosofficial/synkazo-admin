import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingRecoveryApi } from '@/api/billingRecovery';
import { queryKeys } from './queryKeys';

export function useBillingRecoverySettingsQuery() {
  return useQuery({
    queryKey: queryKeys.superAdmin.billingRecovery.settings,
    queryFn: billingRecoveryApi.get,
  });
}
export function useBillingRecoveryStatusQuery() {
  return useQuery({
    queryKey: queryKeys.superAdmin.billingRecovery.status,
    queryFn: billingRecoveryApi.status,
    refetchInterval: 30000,
  });
}
export function useSaveBillingRecoveryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: billingRecoveryApi.save,
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryKeys.superAdmin.billingRecovery.settings,
      }),
  });
}
export function useRunBillingRecoveryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: billingRecoveryApi.run,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.superAdmin.all });
      client.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}
