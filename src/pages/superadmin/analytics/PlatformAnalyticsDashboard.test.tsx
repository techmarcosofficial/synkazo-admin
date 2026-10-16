import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  OrganisationAnalyticsResponse,
  PlatformAnalyticsResponse,
} from '@/types/platformAnalytics';
import { platformAnalyticsApi } from '@/api/platformAnalytics';
import PlatformAnalyticsDashboard from './PlatformAnalyticsDashboard';
import { defaultRange } from './analyticsDisplay';

const mocks = vi.hoisted(() => ({
  analytics: null as PlatformAnalyticsResponse | null,
  organisations: null as OrganisationAnalyticsResponse | null,
  error: false,
}));
vi.mock('@/api/platformAnalytics', () => ({
  platformAnalyticsApi: {
    overview: vi.fn(() =>
      mocks.error
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve(mocks.analytics),
    ),
    organisations: vi.fn(() => Promise.resolve(mocks.organisations)),
  },
}));
vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminPlatformOverviewQuery: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      generatedAt: '2026-10-16T12:00:00Z',
      jobs: {
        queue: {
          waiting: 4,
          active: 2,
          delayed: 1,
          failed: 3,
          completed: 1000,
          workerOnline: true,
        },
      },
      recentAlerts: [],
      errors: {},
    },
  }),
}));

function fixture(): PlatformAnalyticsResponse {
  const quality = {
    status: 'provisional' as const,
    source: 'payment_results',
    message: 'Payment totals and dates are awaiting provider reconciliation.',
    verifiedFrom: null,
    verifiedThrough: null,
    reconciliationReference: null,
  };
  const point = {
    bucket: defaultRange().from,
    completed: 8,
    failed: 1,
    partial: 1,
    running: 0,
    terminalRuns: 10,
    recordsWritten: 100,
    recordsFetched: 120,
    durationMs: 3600000,
    missingDurationRuns: 2,
    unattributedRuns: 0,
    successRate: 0.8,
  };
  const { bucket: _bucket, ...totals } = point;
  return {
    generatedAt: '2026-10-16T12:00:00Z',
    definitionVersion: 'platform-analytics-v1',
    cohortBasis: 'current-plan',
    currency: 'USD',
    range: { ...defaultRange(), granularity: 'day', timezone: 'UTC' },
    sections: {
      revenue: {
        collectedMinor: null,
        recordedPayments: 2,
        unattributedPayments: 0,
        currencies: ['USD'],
        series: [{ bucket: point.bucket, collectedMinor: null, payments: 2 }],
        quality,
      },
      processing: {
        totals,
        series: [point],
        quality: { ...quality, source: 'sync_run_logs', status: 'partial' },
      },
      customers: {
        asOf: '2026-10-16T12:00:00Z',
        total: 11,
        byPlan: [{ planId: null, name: 'Unassigned', count: 11 }],
        byStatus: [{ status: 'active', count: 11 }],
        bySubscriptionStatus: [{ status: 'past_due', count: 3 }],
      },
    },
    errors: {},
    unavailableMetrics: [
      {
        metric: 'MRR, ARR and churn',
        reason: 'Effective recurring terms are not verified.',
      },
    ],
  };
}

function renderPage(path = '/super-admin/overview') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <PlatformAnalyticsDashboard />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.error = false;
  mocks.analytics = fixture();
  mocks.organisations = {
    generatedAt: '2026-10-16T12:00:00Z',
    currency: 'USD',
    quality: mocks.analytics.sections.revenue!.quality,
    total: 1,
    page: 1,
    limit: 10,
    data: [
      {
        organisationId: 'org-1',
        name: 'Example organisation',
        status: 'active',
        archived: false,
        planName: 'Pro',
        collectedMinor: null,
        runs: 10,
        recordsWritten: 100,
        durationMs: 3600000,
        missingDurationRuns: 2,
        failedRuns: 1,
        partialRuns: 1,
        successRate: 0.8,
      },
    ],
  };
});
afterEach(cleanup);

describe('Platform analytics dashboard', () => {
  it('shows operational analytics and gated cash without inventing revenue or missing duration', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Collections' }),
    ).toBeInTheDocument();
    await screen.findByText('Example organisation');
    expect(screen.getByText('Awaiting reconciliation')).toBeInTheDocument();
    expect(
      screen.getByText(/This graph shows payment counts, not money/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 runs have no duration measurement/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(screen.getByText('Worker online')).toBeInTheDocument();
    expect(screen.queryByText('1000')).not.toBeInTheDocument();
    expect(
      screen.getByText('Example organisation').closest('a'),
    ).toHaveAttribute('href', '/super-admin/organisations/org-1');
    expect(screen.getByRole('link', { name: /past due/i })).toHaveAttribute(
      'href',
      '/super-admin/organisations?subscriptionStatus=past_due',
    );
  });

  it('renders verified collections with the exact selected currency amount', async () => {
    mocks.analytics!.sections.revenue!.collectedMinor = '11800';
    mocks.analytics!.sections.revenue!.series[0].collectedMinor = '11800';
    mocks.analytics!.sections.revenue!.quality.status = 'reconciled';
    renderPage();
    expect((await screen.findAllByText('$118.00')).length).toBeGreaterThan(0);
    expect(screen.getByText('Reconciled')).toBeInTheDocument();
    expect(
      screen.queryByText(/This graph shows payment counts/),
    ).not.toBeInTheDocument();
  });

  it('keeps other sections usable when a single source fails', async () => {
    mocks.analytics!.sections.revenue = null;
    mocks.analytics!.errors.revenue = 'Collection data could not be loaded.';
    renderPage();
    expect(
      await screen.findByText('Collection data could not be loaded.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Sync reliability' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Worker online')).toBeInTheDocument();
  });

  it('changes query filters for quick ranges and preserves UTC boundaries', async () => {
    renderPage();
    await screen.findByText('Example organisation');
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() =>
      expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
        expect.objectContaining({ ...defaultRange(7), currency: 'USD' }),
      ),
    );
    expect(screen.getByLabelText('From date UTC')).toHaveValue(
      defaultRange(7).from,
    );
  });

  it('does not request an invalid or oversized URL date range', async () => {
    renderPage('/super-admin/overview?from=2020-01-01&to=2026-10-16');
    expect(
      screen.getAllByText(/Choose an ordered UTC date range/).length,
    ).toBeGreaterThan(0);
    expect(platformAnalyticsApi.overview).not.toHaveBeenCalled();
    expect(platformAnalyticsApi.organisations).not.toHaveBeenCalled();
  });
});
