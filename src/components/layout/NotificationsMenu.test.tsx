import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import NotificationsMenu from './NotificationsMenu';

import type { Notification } from '@/api/notificationsApi';
import { TooltipProvider } from '@/components/ui/tooltip';

const notifications: Notification[] = [
  {
    id: 'sync-complete',
    type: 'sync_completed',
    title: 'Customers → Companies completed',
    message: '220 records synced in 24s',
    createdAt: '2026-09-22T08:00:00.000Z',
    readAt: null,
  },
  {
    id: 'sync-failed',
    type: 'sync_failed',
    title: 'Sync failed',
    message: 'A job run ended with errors',
    createdAt: '2026-09-21T08:00:00.000Z',
    readAt: null,
  },
  {
    id: 'worker-offline',
    type: 'worker_offline',
    title: 'Worker offline',
    message: 'The queue worker needs attention',
    createdAt: '2026-09-20T08:00:00.000Z',
    readAt: '2026-09-20T09:00:00.000Z',
  },
];

const mocks = vi.hoisted(() => ({
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  refetch: vi.fn(),
  state: {
    notifications: [] as Notification[],
    totalCount: 0,
    unreadCount: 0,
    isLoading: false,
    isError: false,
    isRefreshing: false,
    isMarkAllPending: false,
  },
}));

vi.mock('@/queries/useNotifications', () => ({
  useNotifications: () => ({
    ...mocks.state,
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
    refetch: mocks.refetch,
  }),
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = {
    notifications,
    totalCount: notifications.length,
    unreadCount: 2,
    isLoading: false,
    isError: false,
    isRefreshing: false,
    isMarkAllPending: false,
  };
});

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function renderMenu() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <NotificationsMenu />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('NotificationsMenu', () => {
  it('opens an anchored compact popover with counts and navigation actions', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      screen.getByRole('button', { name: 'Notifications, 2 unread' }),
    );

    const popover = document.querySelector('[data-slot="popover-content"]');
    expect(popover).toBeInTheDocument();
    expect(
      within(popover as HTMLElement).getByText('Here are your latest updates.'),
    ).toBeVisible();
    expect(
      within(popover as HTMLElement).getByRole('tab', { name: /All\s*3/ }),
    ).toBeVisible();
    expect(
      within(popover as HTMLElement).getByRole('link', {
        name: 'Notification preferences',
      }),
    ).toHaveAttribute('href', '/settings/preferences');
    expect(
      within(popover as HTMLElement).getByRole('link', {
        name: 'Queue health',
      }),
    ).toHaveAttribute('href', '/scheduler');
  });

  it('filters notifications and marks an unread notification when opened', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      screen.getByRole('button', { name: 'Notifications, 2 unread' }),
    );
    await user.click(screen.getByRole('tab', { name: /System\s*1/ }));

    expect(screen.getByText('Worker offline')).toBeVisible();
    expect(screen.queryByText('Sync failed')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Unread\s*2/ }));
    await user.click(
      screen.getByRole('link', { name: /Customers → Companies completed/ }),
    );

    expect(mocks.markRead).toHaveBeenCalledWith('sync-complete');
  });

  it('marks every notification as read from the footer', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      screen.getByRole('button', { name: 'Notifications, 2 unread' }),
    );
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(mocks.markAllRead).toHaveBeenCalledOnce();
  });

  it('shows a recoverable error state', async () => {
    mocks.state = {
      ...mocks.state,
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      isError: true,
    };
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Notifications couldn't load",
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
