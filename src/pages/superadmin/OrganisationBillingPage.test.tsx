import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationBillingPage from './OrganisationBillingPage';

import type {
  HistoryItem,
  SuperAdminBillingOverview,
  SuperAdminInvoiceDetail,
  SuperAdminInvoiceListItem,
  SuperAdminOrganisationDetail,
  SuperAdminPage,
  SuperAdminSubscriptionDetail,
} from '@/types';

const overviewFixture: SuperAdminBillingOverview = {
  plan: {
    planId: 'plan-pro',
    planName: 'Pro',
    subscriptionStatus: 'active',
    billingInterval: 'month',
    trialEndsAt: null,
    trialPendingStart: false,
    currentPeriodEnd: new Date(Date.now() + 15 * 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
    overLimit: {
      projects: { count: 3, limit: 10, over: false },
      jobs: { count: 12, limit: 50, over: false },
      teamMembers: { count: 6, limit: 10, over: false },
      records: { count: 1042, limit: 100_000, over: false },
      isOverLimit: false,
    },
  },
  usage: {
    recordsSynced: 1042,
    maxRecordsPerMonth: 100_000,
    periodStart: new Date().toISOString(),
    remaining: 98_958,
  },
};

const invoicesFixture: SuperAdminInvoiceListItem[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-000-1',
    status: 'paid',
    amountDue: 4900,
    amountPaid: 4900,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    dueDate: null,
    hostedInvoiceUrl: 'https://stripe.example/hosted/abc',
  },
];

const orgFixture: SuperAdminOrganisationDetail = {
  id: 'org-1',
  name: 'Northwind HVAC',
  slug: 'northwind',
  description: null,
  logoUrl: null,
  status: 'active',
  owner: null,
  settings: { defaultCurrency: null },
  plan: { id: 'plan-pro', name: 'Pro', subscriptionStatus: 'active' },
  access: {
    mode: 'super_admin_organisation_access',
    planRestrictionsBypassed: true,
    canManage: true,
  },
  usage: {
    members: { total: 6, active: 6, limit: 10 },
    projects: { count: 3, limit: 10, over: false },
    jobs: { count: 12, limit: 50, over: false },
    records: {
      used: 1042,
      limit: 100_000,
      remaining: 98_958,
      periodStart: new Date().toISOString(),
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const subscriptionFixture: SuperAdminSubscriptionDetail = {
  id: 'sub_123',
  planId: 'plan-pro',
  planName: 'Pro',
  status: 'active',
  trialEndAt: null,
  currentPeriodEnd: '2026-11-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  pendingPlanId: null,
  pendingPriceId: null,
  pendingPlanChangeAt: null,
  creditBalance: 2500,
  defaultPaymentMethod: 'pm_card_visa',
  paymentMethod: {
    id: 'pm-1',
    cardBrand: 'visa',
    cardLast4: '4242',
    cardExpMonth: 12,
    cardExpYear: 2028,
    isDefault: true,
  },
};

const historyFixture: SuperAdminPage<HistoryItem> = {
  data: [
    {
      id: 'hist-1',
      eventType: 'payment_succeeded',
      oldStatus: null,
      newStatus: 'paid',
      description: 'Invoice INV-000-1 paid successfully',
      createdAt: new Date().toISOString(),
      orderId: 'inv-1',
      paymentId: 'pi-1',
      amount: 4900,
      currency: 'usd',
      orderStatus: 'paid',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const mocks = vi.hoisted(() => ({
  overview: null as SuperAdminBillingOverview | null,
  subscription: null as SuperAdminSubscriptionDetail | null,
  invoices: null as SuperAdminPage<SuperAdminInvoiceListItem> | null,
  history: null as SuperAdminPage<HistoryItem> | null,
  invoiceDetail: null as SuperAdminInvoiceDetail | null,
  org: null as SuperAdminOrganisationDetail | null,
}));

vi.mock('@/api/superAdminOrganisations', () => ({
  superAdminOrganisationsApi: {
    get: vi.fn(() => Promise.resolve(mocks.org)),
  },
}));
vi.mock('@/api/superAdminBilling', () => ({
  superAdminBillingApi: {
    overview: vi.fn(() => Promise.resolve(mocks.overview)),
    subscription: vi.fn(() => Promise.resolve(mocks.subscription)),
    invoices: vi.fn(() => Promise.resolve(mocks.invoices)),
    history: vi.fn(() => Promise.resolve(mocks.history)),
    invoiceDetail: vi.fn(() => Promise.resolve(mocks.invoiceDetail)),
    retryInvoice: vi.fn(() => Promise.resolve({ success: true })),
    assignPlan: vi.fn(() => Promise.resolve({ planId: 'plan-pro' })),
  },
}));

function renderPage(orgId = 'org-1', initialTab = 'overview') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter
      initialEntries={[
        `/super-admin/organisations/${orgId}/billing?tab=${initialTab}`,
      ]}
    >
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path="/super-admin/organisations/:organisationId/billing"
            element={<OrganisationBillingPage />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.overview = overviewFixture;
  mocks.subscription = subscriptionFixture;
  mocks.invoices = {
    data: invoicesFixture,
    total: 1,
    page: 1,
    limit: 10,
  };
  mocks.history = historyFixture;
  mocks.invoiceDetail = {
    ...invoicesFixture[0],
    subtotal: 4900,
    discountAmount: 0,
    taxAmount: 0,
  };
  mocks.org = orgFixture;
});

afterEach(() => {
  cleanup();
});

describe('OrganisationBillingPage', () => {
  it('renders plan + subscription overview', async () => {
    renderPage();
    expect(await screen.findByText('Subscription')).toBeInTheDocument();
    expect((await screen.findAllByText('Pro')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Upcoming billing & Payment Method')).toBeInTheDocument();
  });

  it('renders Invoices & Payments tab with invoice rows and actions', async () => {
    renderPage('org-1', 'invoices');
    expect(await screen.findByText('INV-000-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      'https://stripe.example/hosted/abc',
    );
  });

  it('surfaces the over-plan alert when any resource is over its limit', async () => {
    mocks.overview = {
      ...overviewFixture,
      plan: {
        ...overviewFixture.plan,
        overLimit: {
          ...overviewFixture.plan.overLimit,
          projects: { count: 12, limit: 10, over: true },
          isOverLimit: true,
        },
      },
    };
    renderPage();
    expect(await screen.findByText('Over-plan resources')).toBeInTheDocument();
  });

  it('shows an empty state when the org has no invoices', async () => {
    mocks.invoices = { data: [], total: 0, page: 1, limit: 10 };
    renderPage('org-1', 'invoices');
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument();
  });

  it('renders the Subscription tab with live details and masked payment method', async () => {
    renderPage('org-1', 'subscription');
    expect(await screen.findByText('Live Subscription')).toBeInTheDocument();
    expect(await screen.findByText('Payment Method on File')).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    expect(screen.getAllByText('VISA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders Payment History tab with timeline and table events', async () => {
    renderPage('org-1', 'history');
    expect(await screen.findByText('Billing & Payment History')).toBeInTheDocument();
    expect(await screen.findByText('Payment succeeded')).toBeInTheDocument();
    expect(screen.getByText(/Invoice INV-000-1 paid successfully/)).toBeInTheDocument();
  });

  it('displays the manual billing hold banner when paymentHoldActive is true', async () => {
    mocks.org = {
      ...orgFixture,
      paymentHoldActive: true,
    };
    renderPage();
    expect(await screen.findByText('Manual Billing Hold Active')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /clear payment hold/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('displays past-due alert when subscription status is past_due', async () => {
    mocks.overview = {
      ...overviewFixture,
      plan: {
        ...overviewFixture.plan,
        subscriptionStatus: 'past_due',
      },
    };
    renderPage();
    expect(
      await screen.findByText(/Subscription Past Due \(Grace Period Active\)/i),
    ).toBeInTheDocument();
  });
});
