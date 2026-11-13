import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentGatewaysApi } from '@/api/paymentGateways';
import { queryKeys } from './queryKeys';

export function usePaymentGatewaySettingsQuery() {
  return useQuery({
    queryKey: queryKeys.superAdmin.paymentGateways,
    queryFn: paymentGatewaysApi.get,
  });
}

/** Any change can move prices/plans between environments, so plan lists are refreshed too. */
function useInvalidateAfterGatewayChange() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({
      queryKey: queryKeys.superAdmin.paymentGateways,
    });
    void client.invalidateQueries({ queryKey: queryKeys.billing.publicConfig });
    void client.invalidateQueries({ queryKey: queryKeys.billing.adminPlans });
  };
}

export function useSavePaymentGatewaySettingsMutation() {
  const client = useQueryClient();
  const invalidate = useInvalidateAfterGatewayChange();
  return useMutation({
    mutationFn: paymentGatewaysApi.save,
    onSuccess: (data) => {
      client.setQueryData(queryKeys.superAdmin.paymentGateways, data.settings);
      invalidate();
    },
  });
}

export function useSyncRazorpayCatalogMutation() {
  const invalidate = useInvalidateAfterGatewayChange();
  return useMutation({
    mutationFn: paymentGatewaysApi.syncRazorpayCatalog,
    onSuccess: invalidate,
  });
}

export function useMoveCatalogMutation() {
  const invalidate = useInvalidateAfterGatewayChange();
  return useMutation({
    mutationFn: paymentGatewaysApi.moveCatalog,
    onSuccess: invalidate,
  });
}

export function useTestPaymentGatewayMutation() {
  return useMutation({ mutationFn: paymentGatewaysApi.test });
}

/** Active gateway + browser-safe public keys, for checkout. */
export function usePublicPaymentConfigQuery() {
  return useQuery({
    queryKey: queryKeys.billing.publicConfig,
    queryFn: paymentGatewaysApi.publicConfig,
    staleTime: 5 * 60_000,
  });
}
