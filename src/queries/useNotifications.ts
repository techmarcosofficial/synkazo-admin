import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { queryKeys } from './queryKeys';

import { notificationsApi, type Notification } from '@/api/notificationsApi';
import { sseClient } from '@/lib/sseClient';

type NotificationListResponse = Awaited<
  ReturnType<typeof notificationsApi.list>
>;
type UnreadCountResponse = Awaited<
  ReturnType<typeof notificationsApi.unreadCount>
>;

function isNotification(value: unknown): value is Notification {
  if (!value || typeof value !== 'object') return false;
  const notification = value as Partial<Notification>;
  return (
    typeof notification.id === 'string' &&
    typeof notification.type === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.createdAt === 'string'
  );
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list({ limit: 50 }),
  });
  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.unreadCount,
  });

  useEffect(
    () =>
      sseClient.on('notification:new', (value) => {
        if (!isNotification(value)) return;

        const current = queryClient.getQueryData<NotificationListResponse>(
          queryKeys.notifications.list,
        );
        if (current?.data.some((item) => item.id === value.id)) return;

        queryClient.setQueryData<NotificationListResponse>(
          queryKeys.notifications.list,
          (previous) => ({
            data: [value, ...(previous?.data ?? [])].slice(0, 50),
            total: (previous?.total ?? previous?.data.length ?? 0) + 1,
          }),
        );

        if (!value.readAt) {
          queryClient.setQueryData<UnreadCountResponse>(
            queryKeys.notifications.unreadCount,
            (previous) => ({ count: (previous?.count ?? 0) + 1 }),
          );
        }
      }),
    [queryClient],
  );

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id: string) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.list }),
        queryClient.cancelQueries({
          queryKey: queryKeys.notifications.unreadCount,
        }),
      ]);

      const previousList = queryClient.getQueryData<NotificationListResponse>(
        queryKeys.notifications.list,
      );
      const previousCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount,
      );
      const wasUnread = previousList?.data.some(
        (item) => item.id === id && !item.readAt,
      );

      queryClient.setQueryData<NotificationListResponse>(
        queryKeys.notifications.list,
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((item) =>
                  item.id === id && !item.readAt
                    ? { ...item, readAt: new Date().toISOString() }
                    : item,
                ),
              }
            : current,
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount,
          (current) => ({ count: Math.max(0, (current?.count ?? 1) - 1) }),
        );
      }

      return { previousList, previousCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.notifications.list,
          context.previousList,
        );
      }
      if (context?.previousCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          context.previousCount,
        );
      }
      toast.error('Could not mark that notification as read.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount,
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.list }),
        queryClient.cancelQueries({
          queryKey: queryKeys.notifications.unreadCount,
        }),
      ]);

      const previousList = queryClient.getQueryData<NotificationListResponse>(
        queryKeys.notifications.list,
      );
      const previousCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount,
      );

      queryClient.setQueryData<NotificationListResponse>(
        queryKeys.notifications.list,
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((item) => ({
                  ...item,
                  readAt: item.readAt ?? new Date().toISOString(),
                })),
              }
            : current,
      );
      queryClient.setQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount,
        { count: 0 },
      );

      return { previousList, previousCount };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.notifications.list,
          context.previousList,
        );
      }
      if (context?.previousCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          context.previousCount,
        );
      }
      toast.error('Could not mark all notifications as read.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount,
      });
    },
  });

  const refetch = useCallback(
    () => Promise.all([listQuery.refetch(), unreadCountQuery.refetch()]),
    [listQuery, unreadCountQuery],
  );

  const notifications = listQuery.data?.data ?? [];
  const localUnreadCount = notifications.filter((item) => !item.readAt).length;

  return {
    notifications,
    totalCount: listQuery.data?.total ?? notifications.length,
    unreadCount: unreadCountQuery.data?.count ?? localUnreadCount,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    isRefreshing: listQuery.isFetching && !listQuery.isLoading,
    refetch,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    isMarkAllPending: markAllReadMutation.isPending,
  };
}
