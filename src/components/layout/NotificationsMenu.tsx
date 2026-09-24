import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Settings,
  Settings2,
  Webhook,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Notification } from '@/api/notificationsApi';
import ListRow from '@/components/shared/list/ListRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/queries/useNotifications';

type NotifTone = 'success' | 'warning' | 'danger' | 'info';
type NotifCategory = 'sync' | 'system';
type FilterTab = 'all' | 'unread' | 'sync' | 'system';

const TONE_CLASSES: Record<NotifTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
};

// One entry per backend NotificationType (see notifications/entities/notification.entity.ts).
const NOTIF_META: Record<
  string,
  { icon: LucideIcon; tone: NotifTone; category: NotifCategory }
> = {
  sync_completed: { icon: CheckCircle2, tone: 'success', category: 'sync' },
  sync_failed: { icon: XCircle, tone: 'danger', category: 'sync' },
  sync_limit_capped: {
    icon: AlertTriangle,
    tone: 'warning',
    category: 'sync',
  },
  sync_limit_blocked: {
    icon: AlertTriangle,
    tone: 'danger',
    category: 'sync',
  },
  worker_offline: { icon: WifiOff, tone: 'danger', category: 'system' },
  queue_backlog: { icon: Clock, tone: 'warning', category: 'system' },
  webhook_registration_failed: {
    icon: Webhook,
    tone: 'danger',
    category: 'system',
  },
  webhook_subscription_lost: {
    icon: Webhook,
    tone: 'warning',
    category: 'system',
  },
  subscription_past_due: {
    icon: CreditCard,
    tone: 'warning',
    category: 'system',
  },
  subscription_canceled: {
    icon: CreditCard,
    tone: 'danger',
    category: 'system',
  },
};

const DEFAULT_META: (typeof NOTIF_META)[string] = {
  icon: Bell,
  tone: 'info',
  category: 'system',
};

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'All',
  unread: 'Unread',
  sync: 'Sync',
  system: 'System',
};

/** Mirrors the resource links used by notification emails. */
function notificationLink(notification: Notification): string {
  const jobId = notification.data?.jobId;
  const projectId = notification.data?.projectId;
  if (jobId && projectId) return `/projects/${projectId}/jobs/${jobId}`;
  if (
    notification.type === 'webhook_registration_failed' ||
    notification.type === 'webhook_subscription_lost'
  ) {
    return '/connections';
  }
  if (
    notification.type === 'subscription_past_due' ||
    notification.type === 'subscription_canceled'
  ) {
    return '/organization/billing/overview';
  }
  return '/scheduler';
}

function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: () => void;
}) {
  const meta = NOTIF_META[notification.type] ?? DEFAULT_META;
  const tone = TONE_CLASSES[meta.tone];
  const Icon = meta.icon;
  const isUnread = !notification.readAt;

  return (
    <ListRow
      asChild
      className={cn(
        'group items-start gap-2.5 px-3.5 py-2.5',
        isUnread && 'bg-primary/5',
      )}
    >
      <Link
        to={notificationLink(notification)}
        state={
          notification.data?.jobId && notification.data?.projectId
            ? {
                jobBackTo: `/projects/${notification.data.projectId}?tab=sync-rules`,
                jobBackLabel: 'Back to Sync Jobs',
              }
            : undefined
        }
        onClick={() => {
          if (isUnread) onRead(notification.id);
          onNavigate();
        }}
      >
        <div
          data-slot="notification-icon"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center"
        >
          <Icon className={cn('size-4 stroke-[1.75]', tone)} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-sm leading-4.5 font-medium">
              {notification.title || notification.message}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {notification.createdAt && (
                <time
                  className="text-muted-foreground text-[11px] leading-4 whitespace-nowrap"
                  dateTime={notification.createdAt}
                  title={new Date(notification.createdAt).toLocaleString()}
                >
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              )}
              {isUnread && (
                <span
                  className="bg-primary size-2 shrink-0 rounded-full"
                  aria-label="Unread"
                />
              )}
            </div>
          </div>
          {notification.title && (
            <p className="text-muted-foreground line-clamp-1 text-xs leading-4">
              {notification.message}
            </p>
          )}
        </div>
      </Link>
    </ListRow>
  );
}

function NotificationList({
  items,
  emptyTitle,
  onRead,
  onNavigate,
}: {
  items: Notification[];
  emptyTitle: string;
  onRead: (id: string) => void;
  onNavigate: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center px-8 py-6 text-center">
        <div className="bg-muted mb-3 flex size-10 items-center justify-center rounded-full">
          <BellOff className="text-muted-foreground size-5" aria-hidden />
        </div>
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          You&apos;re all caught up. New updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div aria-live="polite">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={onRead}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function NotificationListSkeleton() {
  return (
    <div className="space-y-0.5 p-2.5" aria-label="Loading notifications">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-start gap-2.5 px-1 py-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center px-8 py-6 text-center"
      role="alert"
    >
      <div className="bg-destructive/10 mb-3 flex size-10 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium">Notifications couldn&apos;t load</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Check your connection, then try again.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw aria-hidden />
        Try again
      </Button>
    </div>
  );
}

export default function NotificationsMenu() {
  const {
    notifications,
    totalCount,
    unreadCount,
    isLoading,
    isError,
    isRefreshing,
    refetch,
    markRead,
    markAllRead,
    isMarkAllPending,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');

  const groups = useMemo(
    () => ({
      all: notifications,
      unread: notifications.filter((notification) => !notification.readAt),
      sync: notifications.filter(
        (notification) =>
          (NOTIF_META[notification.type] ?? DEFAULT_META).category === 'sync',
      ),
      system: notifications.filter(
        (notification) =>
          (NOTIF_META[notification.type] ?? DEFAULT_META).category === 'system',
      ),
    }),
    [notifications],
  );

  const counts: Record<FilterTab, number> = {
    all: totalCount,
    unread: unreadCount,
    sync: groups.sync.length,
    system: groups.system.length,
  };
  const emptyTitles: Record<FilterTab, string> = {
    all: 'No notifications yet',
    unread: 'No unread notifications',
    sync: 'No sync notifications',
    system: 'No system notifications',
  };
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell aria-hidden />
          {unreadCount > 0 && (
            <span
              className="bg-destructive ring-card absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-auto gap-0 rounded-none bg-transparent p-0 shadow-none ring-0 dark:ring-0"
      >
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as FilterTab)}
          className="w-[calc(100vw-2rem)] gap-2 sm:w-[24rem]"
        >
          <Card
            size="sm"
            data-notification-surface
            className="gap-0 overflow-hidden py-0"
          >
            <div className="flex items-start justify-between gap-4 px-4 pt-3 pb-1">
              <PopoverHeader>
                <div className="flex items-center gap-2">
                  <PopoverTitle>Notifications</PopoverTitle>
                  <Badge variant="secondary" className="rounded-full">
                    {totalCount}
                  </Badge>
                  {isRefreshing && (
                    <RefreshCw
                      className="text-muted-foreground size-3 animate-spin"
                      aria-label="Refreshing notifications"
                    />
                  )}
                </div>
                <PopoverDescription>
                  Here are your latest updates.
                </PopoverDescription>
              </PopoverHeader>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      to="/settings/preferences"
                      onClick={close}
                      aria-label="Notification preferences"
                    >
                      <Settings2 aria-hidden />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notification preferences</TooltipContent>
              </Tooltip>
            </div>

            <div className="overflow-x-auto px-4">
              <TabsList
                variant="line"
                className="h-9 min-w-max justify-start gap-4 overflow-hidden p-0"
              >
                {(Object.keys(TAB_LABELS) as FilterTab[]).map((value) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="after:bg-primary rounded-full py-2 font-semibold after:-bottom-0.5! after:h-1!"
                  >
                    <span>{TAB_LABELS[value]}</span>
                    <span className="text-[11px] tabular-nums">
                      {counts[value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Card>

          <Card
            size="sm"
            data-notification-surface
            className="gap-0 overflow-hidden py-0"
          >
            <div className="max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <NotificationListSkeleton />
              ) : isError ? (
                <NotificationError onRetry={() => void refetch()} />
              ) : (
                (Object.keys(TAB_LABELS) as FilterTab[]).map((value) => (
                  <TabsContent key={value} value={value} className="mt-0">
                    <NotificationList
                      items={groups[value]}
                      emptyTitle={emptyTitles[value]}
                      onRead={markRead}
                      onNavigate={close}
                    />
                  </TabsContent>
                ))
              )}
            </div>

            <div className="bg-muted/30 flex items-center justify-between gap-3 border-t px-3 py-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/scheduler" onClick={close}>
                  <Activity aria-hidden />
                  Queue health
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead()}
                disabled={unreadCount === 0}
                loading={isMarkAllPending}
              >
                Mark all as read
              </Button>
            </div>
          </Card>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
