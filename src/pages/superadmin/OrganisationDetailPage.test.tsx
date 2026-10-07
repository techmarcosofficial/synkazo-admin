import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationDetailPage from './OrganisationDetailPage';

import type {
  SuperAdminActivityEntry,
  SuperAdminOrganisationDetail,
  SuperAdminPage,
} from '@/types';

const detailFixture = (
  overrides: Partial<SuperAdminOrganisationDetail> = {},
): SuperAdminOrganisationDetail => ({
  id: 'org-1',
  name: 'Northwind HVAC',
  slug: 'northwind',
  description: null,
  logoUrl: null,
  status: 'active',
  owner: {
    id: 'user-1',
    email: 'owner@northwind.example',
    fullName: 'Owner Name',
    isActive: true,
  },
  settings: { defaultCurrency: null },
  plan: { id: 'plan-pro', name: 'Pro', subscriptionStatus: 'active' },
  access: {
    mode: 'super_admin_organisation_access',
    planRestrictionsBypassed: true,
    canManage: true,
  },
  usage: {
    members: { total: 8, active: 6, limit: 10 },
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
  ...overrides,
});

const mocks = vi.hoisted(() => ({
  detail: null as SuperAdminOrganisationDetail | null,
  activity: {
    data: [] as SuperAdminActivityEntry[],
    total: 0,
    page: 1,
    limit: 5,
  } as SuperAdminPage<SuperAdminActivityEntry>,
}));

vi.mock('@/api/superAdminOrganisations', () => ({
  superAdminOrganisationsApi: {
    get: vi.fn(() => Promise.resolve(mocks.detail)),
  },
}));

vi.mock('@/api/superAdminActivity', () => ({
  superAdminActivityApi: {
    list: vi.fn(() => Promise.resolve(mocks.activity)),
  },
}));

function renderPage(orgId = 'org-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[`/super-admin/organisations/${orgId}/overview`]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path="/super-admin/organisations/:organisationId/overview"
            element={<OrganisationDetailPage />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.detail = detailFixture();
  mocks.activity = { data: [], total: 0, page: 1, limit: 5 };
});

afterEach(() => {
  cleanup();
});

describe('OrganisationDetailPage', () => {
  it('renders name, plan, owner, and usage metrics', async () => {
    renderPage();

    expect(await screen.findByText('Northwind HVAC')).toBeInTheDocument();
    expect(screen.getByText('northwind')).toBeInTheDocument();
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
    expect(screen.getByText('owner@northwind.example')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // members active
    expect(screen.getByText('3')).toBeInTheDocument(); // projects count
  });

  it('shows a suspension banner when the organisation status is suspended', async () => {
    mocks.detail = detailFixture({ status: 'suspended' });
    renderPage();

    expect(
      await screen.findByText('Organisation is suspended'),
    ).toBeInTheDocument();
  });

  it('surfaces an "over plan" hint for over-limit resources', async () => {
    mocks.detail = detailFixture({
      usage: {
        members: { total: 8, active: 6, limit: 10 },
        projects: { count: 15, limit: 10, over: true },
        jobs: { count: 12, limit: 50, over: false },
        records: {
          used: 500,
          limit: 1000,
          remaining: 500,
          periodStart: new Date().toISOString(),
        },
      },
    });

    renderPage();

    expect(
      await screen.findByText(/of 10 allowed · over plan/i),
    ).toBeInTheDocument();
  });

  it('links back to the organisations list', async () => {
    renderPage();
    await screen.findByText('Northwind HVAC');

    const backLink = screen.getByText('All organisations').closest('a');
    expect(backLink).toHaveAttribute('href', '/super-admin/organisations');
  });
});
