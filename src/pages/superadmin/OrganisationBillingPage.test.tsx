import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationBillingPage from './OrganisationBillingPage';

import type {
  SuperAdminBillingOverview,
  SuperAdminInvoiceListItem,
  SuperAdminOrganisationDetail,
  SuperAdminPage,
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

const mocks = vi.hoisted(() => ({
  overview: null as SuperAdminBillingOverview | null,
  invoices: null as SuperAdminPage<SuperAdminInvoiceListItem> | null,
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
    invoices: vi.fn(() => Promise.resolve(mocks.invoices)),
  },
}));

function renderPage(orgId = 'org-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[`/super-admin/organisations/${orgId}/billing`]}>
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
  mocks.invoices = {
    data: invoicesFixture,
    total: 1,
    page: 1,
    limit: 10,
  };
  mocks.org = orgFixture;
});

afterEach(() => {
  cleanup();
});

describe('OrganisationBillingPage', () => {
  it('renders plan + subscription overview and the invoice row', async () => {
    renderPage();
    expect(await screen.findByText('Subscription')).toBeInTheDocument();
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
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
    renderPage();
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument();
  });
});
