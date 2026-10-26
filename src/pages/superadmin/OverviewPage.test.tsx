import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { format as formatDate } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAnalyticsResponse } from '@/types/platformAnalytics';
import { platformAnalyticsApi } from '@/api/platformAnalytics';
import OverviewPage from './OverviewPage';
import { defaultRange } from './analytics/analyticsDisplay';

const mocks = vi.hoisted(() => ({
  analytics: null as PlatformAnalyticsResponse | null,
  error: false,
  liveError: false,
  queueError: false,
  liveRefetch: vi.fn(),
  alerts:
    [] as import('@/types/superAdmin').PlatformOverviewResponse['recentAlerts'],
}));
vi.mock('@/api/platformAnalytics', () => ({
  platformAnalyticsApi: {
    overview: vi.fn(() =>
      mocks.error
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve(mocks.analytics),
    ),
  },
}));
vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminPlatformOverviewQuery: () => ({
    isLoading: false,
    isError: mocks.liveError,
    isFetching: false,
    refetch: mocks.liveRefetch,
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
      recentAlerts: mocks.alerts,
      errors: mocks.queueError ? { queue: 'Queue unavailable' } : {},
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
        paidOrganisations: { confirmed: 4, unverified: 0 },
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

function CurrentLocation() {
  const location = useLocation();
  return (
    <output aria-label="Current URL">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderPage(path = '/super-admin/overview') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <OverviewPage />
        <CurrentLocation />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.error = false;
  mocks.liveError = false;
  mocks.queueError = false;
  mocks.alerts = [];
  mocks.analytics = fixture();
});
afterEach(cleanup);

describe('Platform overview', () => {
  it('defaults to a compact summary with honest paid and worker values and relevant links', async () => {
    renderPage('/super-admin/overview');
    await screen.findByText('Unassigned');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(
      '/super-admin/overview',
    );
    expect(
      screen.queryByRole('button', { name: 'Summary' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Analytics' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Details' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Collections' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Total organisations/ }),
    ).toHaveTextContent('11');
    expect(
      screen.getByRole('link', { name: /Active paid organisations/ }),
    ).toHaveTextContent('4');
    expect(
      screen.getByRole('link', { name: /Workers online/ }),
    ).toHaveTextContent('Online');
    expect(
      screen.getByText(/Heartbeat status · count unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Past-due billing/ }),
    ).toHaveAttribute(
      'href',
      '/super-admin/organisations?subscriptionStatus=past_due',
    );
    expect(
      screen.queryByRole('heading', { name: 'Top organisations' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Active paid organisations/ }),
    ).toHaveAttribute('href', '/super-admin/overview#overview-customers');
    expect(screen.getByText('Unassigned').closest('a')).toHaveAttribute(
      'href',
      '/super-admin/organisations?planId=unassigned',
    );
  });

  it('renders clickable links for customer portfolio plan bars with relevant planId filter', async () => {
    mocks.analytics!.sections.customers!.byPlan = [
      { planId: 'plan-enterprise', name: 'Enterprise', count: 5 },
      { planId: null, name: 'Unassigned', count: 6 },
    ];
    renderPage('/super-admin/overview');
    await screen.findByText('Enterprise');

    const enterpriseLink = screen.getByRole('link', {
      name: /Filter by Enterprise plan: 5 organisations/,
    });
    expect(enterpriseLink).toHaveAttribute(
      'href',
      '/super-admin/organisations?planId=plan-enterprise',
    );

    const unassignedLink = screen.getByRole('link', {
      name: /Filter by Unassigned plan: 6 organisations/,
    });
    expect(unassignedLink).toHaveAttribute(
      'href',
      '/super-admin/organisations?planId=unassigned',
    );
  });

  it('keeps live operational data available when historical analytics sources fail', async () => {
    mocks.analytics!.sections.customers = null;
    mocks.analytics!.sections.processing = null;
    mocks.analytics!.errors = {
      customers: 'Customer data unavailable.',
      processing: 'Processing data unavailable.',
    };
    renderPage('/super-admin/overview');
    await screen.findByText('Customer data unavailable.');
    expect(
      screen.getByRole('link', { name: /Total organisations/ }),
    ).toHaveTextContent('—');
    expect(
      screen.getByRole('link', { name: /Past-due billing/ }),
    ).toHaveTextContent('—');
    expect(
      screen.getByRole('link', { name: /Sync success rate/ }),
    ).toHaveTextContent('—');
    expect(
      screen.getByRole('link', { name: /Workers online/ }),
    ).toHaveTextContent('Online');
  });

  it('converts an inclusive through date to the API exclusive UTC boundary', async () => {
    renderPage('/super-admin/overview');
    await screen.findByText('Unassigned');
    fireEvent.click(screen.getByRole('button', { name: 'Choose date range' }));
    const from = defaultRange().from;
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(formatDate(new Date(`${from}T00:00:00`), 'PPPP')),
      }),
    );
    expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
      expect.objectContaining(defaultRange()),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
    const expectedTo = new Date(
      new Date(`${from}T00:00:00Z`).getTime() + 86400000,
    )
      .toISOString()
      .slice(0, 10);
    await waitFor(() =>
      expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
        expect.objectContaining({ from, to: expectedTo }),
      ),
    );
  });

  it('withholds the paid total when payment evidence is incomplete, without inferring paid from active plans', async () => {
    mocks.analytics!.sections.customers!.paidOrganisations = {
      confirmed: 2,
      unverified: 3,
    };
    mocks.queueError = true;
    renderPage('/super-admin/overview');
    await screen.findByText('Unassigned');
    expect(
      screen.getByRole('link', { name: /Active paid organisations/ }),
    ).toHaveTextContent('—');
    expect(screen.getByText('2 confirmed · 3 unverified')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Workers online/ }),
    ).toHaveTextContent('—');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Live queue status could not be loaded',
    );
  });

  it.each(['analytics', 'summary', 'classic'])(
    'normalizes the old %s view URL and removes Analytics filters while preserving dates',
    async (view) => {
      const range = defaultRange(7);
      renderPage(
        `/super-admin/overview?view=${view}&from=${range.from}&to=${range.to}&currency=EUR&granularity=month&planId=unassigned`,
      );
      await screen.findByText('Unassigned');
      expect(screen.getByLabelText('Current URL')).toHaveTextContent(
        `/super-admin/overview?from=${range.from}&to=${range.to}`,
      );
      expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith({
        ...range,
        currency: 'USD',
        granularity: 'day',
      });
      expect(
        screen.queryByRole('heading', { name: 'Collections' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Clear plan filter' }),
      ).not.toBeInTheDocument();
    },
  );

  it('separates routine activity from issues while preserving source severity and organisation context', async () => {
    const base = {
      resource: 'organisation',
      resourceId: 'org-1',
      userEmail: 'operator@example.test',
      organisationId: 'org-1',
      organisationName: 'Example organisation',
      createdAt: '2026-10-16T12:00:00Z',
    };
    mocks.alerts = [
      {
        ...base,
        id: 'routine',
        action: 'organisation.plan_assigned',
        summary: 'Plan assigned',
        severity: 'warning',
      },
      {
        ...base,
        id: 'issue',
        action: 'billing.payment_failed',
        summary: 'Payment failed',
        severity: 'critical',
      },
      {
        ...base,
        id: 'missing-context',
        organisationId: 'deleted-org',
        organisationName: null,
        action: 'billing.subscription_issue',
        summary: 'Subscription issue',
        severity: 'warning',
      },
    ];
    renderPage('/super-admin/overview');
    expect(await screen.findByText('Payment failed')).toBeVisible();
    expect(screen.getByText('Plan assigned')).not.toBeVisible();
    fireEvent.click(screen.getByText('Administrative activity'));
    expect(screen.getByText('Plan assigned')).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Payment failed/ }),
    ).toHaveTextContent('critical');
    expect(
      screen.getByRole('link', { name: /Plan assigned/ }),
    ).toHaveTextContent('warning');
    expect(
      screen.getByRole('link', { name: /Payment failed/ }),
    ).toHaveAttribute('href', '/super-admin/organisations/org-1/activity');
    expect(screen.queryByText('operator@example.test')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Subscription issue/ }),
    ).toHaveAttribute('href', '/super-admin/audit-log');
  });

  it('keeps Summary usable when the unused revenue source fails', async () => {
    mocks.analytics!.sections.revenue = null;
    mocks.analytics!.errors.revenue = 'Collection data could not be loaded.';
    renderPage();
    await screen.findByText('Unassigned');
    expect(
      screen.queryByText('Collection data could not be loaded.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Sync reliability' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Queue health' }),
    ).toBeInTheDocument();
  });

  it('refreshes both period and live data', async () => {
    renderPage();
    await screen.findByText('Unassigned');
    const calls = vi.mocked(platformAnalyticsApi.overview).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(platformAnalyticsApi.overview).toHaveBeenCalledTimes(calls + 1),
    );
    expect(mocks.liveRefetch).toHaveBeenCalledOnce();
  });

  it('shows a retryable overview error while retaining live queue status', async () => {
    mocks.error = true;
    renderPage();
    await screen.findAllByText(/Overview data could not be loaded/);
    expect(
      screen.getByRole('link', { name: /Workers online/ }),
    ).toHaveTextContent('Online');
    mocks.error = false;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Unassigned');
    expect(
      screen.queryByText(/Overview data could not be loaded/),
    ).not.toBeInTheDocument();
  });

  it('shows loading and empty states without restoring removed views', async () => {
    mocks.analytics!.sections.customers!.total = 0;
    mocks.analytics!.sections.customers!.byPlan = [];
    mocks.analytics!.sections.processing!.totals.terminalRuns = 0;
    renderPage();
    expect(
      screen.getByRole('status', { name: 'Loading Customer portfolio' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No organisations in this cohort.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No completed, partial or failed runs in this period.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Analytics' }),
    ).not.toBeInTheDocument();
  });

  it('changes query filters for quick ranges and preserves UTC boundaries', async () => {
    renderPage();
    await screen.findByText('Unassigned');
    fireEvent.click(screen.getByRole('button', { name: 'Choose date range' }));
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() =>
      expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
        expect.objectContaining({ ...defaultRange(7), currency: 'USD' }),
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Choose date range' }),
    ).toHaveTextContent(
      formatDate(new Date(`${defaultRange(7).from}T00:00:00`), 'MMM d'),
    );
  });

  it('does not request an invalid or oversized URL date range', async () => {
    renderPage('/super-admin/overview?from=2020-01-01&to=2026-10-16');
    expect(
      screen.getAllByText(/Choose an ordered UTC date range/).length,
    ).toBeGreaterThan(0);
    expect(platformAnalyticsApi.overview).not.toHaveBeenCalled();
  });
});
