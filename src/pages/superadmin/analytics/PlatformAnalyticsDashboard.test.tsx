import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { format as formatDate } from 'date-fns';
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
  liveError: false,
  queueError: false,
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
    organisations: vi.fn(() => Promise.resolve(mocks.organisations)),
  },
}));
vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminPlatformOverviewQuery: () => ({
    isLoading: false,
    isError: mocks.liveError,
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

function renderPage(path = '/super-admin/overview?view=analytics') {
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
  mocks.liveError = false;
  mocks.queueError = false;
  mocks.alerts = [];
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
        subscriptionStatus: 'active',
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
  it('defaults to a compact summary with honest paid and worker values and relevant links', async () => {
    renderPage('/super-admin/overview');
    await screen.findByRole('link', { name: 'Unassigned: 11 organisations' });
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
    expect(platformAnalyticsApi.organisations).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole('link', { name: 'Unassigned: 11 organisations' })
        .getAttribute('href'),
    ).toContain('planId=unassigned');
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
    await screen.findByRole('link', { name: 'Unassigned: 11 organisations' });
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
    await screen.findByRole('link', { name: 'Unassigned: 11 organisations' });
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

  it('preserves dates and cohort when switching views and navigating portfolio bars', async () => {
    mocks.analytics!.sections.customers!.byPlan = [
      { planId: 'plan-1', name: 'Pro', count: 11 },
    ];
    const range = defaultRange(7);
    renderPage(
      `/super-admin/overview?from=${range.from}&to=${range.to}&currency=EUR`,
    );
    const planLink = await screen.findByRole('link', {
      name: 'Pro: 11 organisations',
    });
    expect(planLink.getAttribute('href')).toContain('currency=EUR');
    expect(planLink.getAttribute('href')).toContain('planId=plan-1');
    fireEvent.click(planLink);
    await screen.findByRole('heading', { name: 'Collections' });
    expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
      expect.objectContaining({ ...range, currency: 'EUR', planId: 'plan-1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    await screen.findByRole('heading', { name: 'Customer portfolio' });
    expect(screen.getByText('Current plan cohort: Pro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear plan filter' }));
    await waitFor(() =>
      expect(platformAnalyticsApi.overview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...range,
          currency: 'EUR',
          planId: undefined,
        }),
      ),
    );
  });

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

  it('shows operational analytics and gated cash without inventing revenue or missing duration', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Collections' }),
    ).toBeInTheDocument();
    await screen.findByText('Example organisation');
    expect(
      screen.queryByRole('heading', { name: 'Customer portfolio' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Current plan cohort' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Awaiting reconciliation')).toBeInTheDocument();
    expect(
      screen.getByText(/This graph shows payment counts, not money/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 runs have no duration measurement/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { name: 'Queue health' }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Summary' })).toBeInTheDocument();
  });

  it('changes query filters for quick ranges and preserves UTC boundaries', async () => {
    renderPage();
    await screen.findByText('Example organisation');
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
    expect(platformAnalyticsApi.organisations).not.toHaveBeenCalled();
  });
});
