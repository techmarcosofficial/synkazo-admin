import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OverviewPage from './OverviewPage';

import type { PlatformOverviewResponse } from '@/types';

const overviewFixture: PlatformOverviewResponse = {
  generatedAt: new Date().toISOString(),
  organisations: {
    total: 47,
    byStatus: { active: 42, suspended: 3, pending: 2, archived: 0 },
    bySubscriptionStatus: {
      none: 0,
      trialing: 5,
      active: 35,
      past_due: 4,
      canceled: 3,
      incomplete: 0,
      unpaid: 0,
      paused: 0,
      pending_cancel: 0,
    },
    pastDueCount: 4,
    suspendedCount: 3,
  },
  jobs: {
    queue: {
      waiting: 12,
      active: 3,
      completed: 145,
      failed: 8,
      delayed: 0,
      workerOnline: true,
    },
  },
  recentAlerts: [
    {
      id: 'audit-1',
      action: 'organisation.suspended',
      resource: 'organisation',
      resourceId: 'org-1',
      severity: 'warning',
      userEmail: 'admin@example.test',
      organisationId: 'org-1',
      summary: 'organisation suspended',
      createdAt: new Date().toISOString(),
    },
  ],
};

const mocks = vi.hoisted(() => ({
  overview: null as PlatformOverviewResponse | null,
  error: null as Error | null,
}));

vi.mock('@/api/superAdminPlatform', () => ({
  superAdminPlatformApi: {
    overview: vi.fn(() => {
      if (mocks.error) return Promise.reject(mocks.error);
      return Promise.resolve(mocks.overview);
    }),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <OverviewPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.overview = overviewFixture;
  mocks.error = null;
});

afterEach(() => {
  cleanup();
});

describe('OverviewPage', () => {
  it('renders the top-level metrics and links them to filtered lists', async () => {
    renderPage();

    expect(await screen.findByText('47')).toBeInTheDocument();
    expect(screen.getByText('Organisations')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText('Past-due billing')).toBeInTheDocument();

    const suspendedLink = screen.getByText('Suspended').closest('a');
    expect(suspendedLink).toHaveAttribute(
      'href',
      '/super-admin/organisations?status=suspended',
    );

    const pastDueLink = screen.getByText('Past-due billing').closest('a');
    expect(pastDueLink).toHaveAttribute(
      'href',
      '/super-admin/organisations?subscriptionStatus=past_due',
    );
  });

  it('surfaces the subscription breakdown with links per status', async () => {
    renderPage();
    await screen.findByText('47');

    expect(screen.getByText('Subscriptions by status')).toBeInTheDocument();
    const activeRow = screen.getByText('active').closest('a');
    expect(activeRow).toHaveAttribute(
      'href',
      '/super-admin/organisations?subscriptionStatus=active',
    );
  });

  it('shows recent alerts and links them to org activity when scoped', async () => {
    renderPage();
    await screen.findByText('47');

    const alertLink = screen
      .getByText('organisation suspended')
      .closest('a');
    expect(alertLink).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/activity',
    );
  });

  it('shows an error state with a retry action when the aggregate call fails', async () => {
    mocks.error = new Error('backend unavailable');
    renderPage();

    expect(
      await screen.findByText('Could not load the platform overview'),
    ).toBeInTheDocument();
    expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
