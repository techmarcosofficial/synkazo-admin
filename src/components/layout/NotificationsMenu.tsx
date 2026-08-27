import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Webhook,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { notificationsApi, type Notification } from '@/api/notificationsApi';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sseClient } from '@/lib/sseClient';
import { cn } from '@/lib/utils';

type NotifTone = 'success' | 'warning' | 'danger' | 'info';
type NotifCategory = 'sync' | 'system';

const TONE_CLASSES: Record<NotifTone, { bg: string; text: string }> = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  danger: { bg: 'bg-destructive/10', text: 'text-destructive' },
  info: { bg: 'bg-info/10', text: 'text-info' },
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

/** Where clicking a notification should take the user — mirrors the resource links the
 *  backend itself uses for notification emails (see NotificationsService.dispatchEmail). */
function notificationLink(n: Notification): string {
  const jobId = n.data?.jobId as string | undefined;
  const projectId = n.data?.projectId as string | undefined;
  if (jobId && projectId) return `/projects/${projectId}/jobs/${jobId}`;
  if (
    n.type === 'webhook_registration_failed' ||
    n.type === 'webhook_subscription_lost'
  ) {
    return '/connections';
  }
  if (
    n.type === 'subscription_past_due' ||
    n.type === 'subscription_canceled'
  ) {
    return '/settings?section=billing';
  }
  return '/scheduler';
}

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [res, countRes] = await Promise.all([
        notificationsApi.list({ limit: 50 }),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(res.data ?? []);
      setUnreadCount(countRes.count ?? 0);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    load();
    const handler = (data: unknown) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [data as Notification, ...prev].slice(0, 50));
    };
    return sseClient.on('notification:new', handler);
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt
          ? { ...n, readAt: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* non-fatal */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* non-fatal */
    }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead };
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
      className={cn('items-start px-4 py-2.5', isUnread && 'bg-primary/3')}
    >
      <Link
        to={notificationLink(notification)}
        onClick={() => {
          if (isUnread) onRead(notification.id);
          onNavigate();
        }}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            tone.bg,
          )}
        >
          <Icon className={cn('size-4', tone.text)} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-snug font-medium">
              {notification.title || notification.message}
            </p>
            {isUnread && (
              <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
            )}
          </div>
          {notification.title && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {notification.message}
            </p>
          )}
          <p
            className="text-muted-foreground pt-0.5 text-[11px]"
            title={
              notification.createdAt
                ? new Date(notification.createdAt).toLocaleString()
                : undefined
            }
          >
            {notification.createdAt
              ? formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })
              : ''}
          </p>
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
      <div className="p-6">
        <EmptyState
          icon={Bell}
          title={emptyTitle}
          description="You're all caught up."
        />
      </div>
    );
  }

  return (
    <div>
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRead={onRead}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

type FilterTab = 'all' | 'unread' | 'sync' | 'system';

export default function NotificationsMenu() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');

  const unread = useMemo(
    () => notifications.filter((n) => !n.readAt),
    [notifications],
  );
  const sync = useMemo(
    () =>
      notifications.filter(
        (n) => (NOTIF_META[n.type] ?? DEFAULT_META).category === 'sync',
      ),
    [notifications],
  );
  const system = useMemo(
    () =>
      notifications.filter(
        (n) => (NOTIF_META[n.type] ?? DEFAULT_META).category === 'system',
      ),
    [notifications],
  );

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as FilterTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <SheetTitle className="text-lg">Notifications</SheetTitle>
                <p className="text-xs">
                  Here your notification see the latest update
                </p>
              </div>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </SheetHeader>
          <TabsList variant="line" className="grid w-full grid-cols-4 border-b">
            <TabsTrigger
              value="all"
              className="data-active:text-primary after:bg-primary"
            >
              All{' '}
              <span className="text-muted-foreground/70">
                {notifications.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="data-active:text-primary after:bg-primary"
            >
              Unread{' '}
              <span className="text-muted-foreground/70">{unread.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="sync"
              className="data-active:text-primary after:bg-primary"
            >
              Sync{' '}
              <span className="text-muted-foreground/70">{sync.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-active:text-primary after:bg-primary"
            >
              System{' '}
              <span className="text-muted-foreground/70">{system.length}</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="min-h-0 flex-1">
            <TabsContent value="all" className="mt-0">
              <NotificationList
                items={notifications}
                emptyTitle="No notifications yet"
                onRead={markRead}
                onNavigate={close}
              />
            </TabsContent>
            <TabsContent value="unread" className="mt-0">
              <NotificationList
                items={unread}
                emptyTitle="You're all caught up"
                onRead={markRead}
                onNavigate={close}
              />
            </TabsContent>
            <TabsContent value="sync" className="mt-0">
              <NotificationList
                items={sync}
                emptyTitle="No sync notifications"
                onRead={markRead}
                onNavigate={close}
              />
            </TabsContent>
            <TabsContent value="system" className="mt-0">
              <NotificationList
                items={system}
                emptyTitle="No system notifications"
                onRead={markRead}
                onNavigate={close}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <SheetFooter className="flex-row items-center justify-between border-t">
          <Button asChild variant="link" size="sm" onClick={close}>
            <Link to="/scheduler">Queue health</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
