import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationDetailPage from './OrganisationDetailPage';
import OrganisationScopeLayout from './OrganisationScopeLayout';

import type {
  SuperAdminActivityEntry,
  SuperAdminBillingOverview,
  SuperAdminOrganisationDetail,
  SuperAdminPage,
  SuperAdminProjectListItem,
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
  billingError: false,
  projectsError: false,
  activity: {
    data: [] as SuperAdminActivityEntry[],
    total: 0,
    page: 1,
    limit: 5,
  } as SuperAdminPage<SuperAdminActivityEntry>,
  billing: {
    plan: {
      planId: 'plan-pro',
      planName: 'Pro',
      subscriptionStatus: 'active',
      billingInterval: 'month',
      trialEndsAt: null,
      trialPendingStart: false,
      currentPeriodEnd: '2026-11-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      overLimit: {
        projects: { count: 3, limit: 10, over: false },
        jobs: { count: 12, limit: 50, over: false },
        teamMembers: { count: 8, limit: 10, over: false },
        records: { count: 1042, limit: 100000, over: false },
        isOverLimit: false,
      },
    },
    usage: {
      recordsSynced: 1042,
      maxRecordsPerMonth: 100000,
      periodStart: '2026-10-01T00:00:00.000Z',
      remaining: 98958,
    },
  } as SuperAdminBillingOverview,
  projects: {
    data: [
      {
        id: 'project-1',
        organisationId: 'org-1',
        name: 'CRM sync',
        description: null,
        status: 'active',
        sourcePlatformId: 'hubspot',
        destPlatformId: 'salesforce',
        syncMode: 'one_way',
        jobCount: 3,
        enabledJobCount: 2,
        lastSyncedAt: '2026-10-13T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-10-13T00:00:00.000Z',
      },
    ] as SuperAdminProjectListItem[],
    total: 1,
    page: 1,
    limit: 4,
  } as SuperAdminPage<SuperAdminProjectListItem>,
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

vi.mock('@/api/superAdminBilling', () => ({
  superAdminBillingApi: {
    overview: vi.fn(() =>
      mocks.billingError
        ? Promise.reject(new Error('Billing unavailable'))
        : Promise.resolve(mocks.billing),
    ),
  },
}));

vi.mock('@/api/superAdminOperations', () => ({
  superAdminOperationsApi: {
    listProjects: vi.fn(() =>
      mocks.projectsError
        ? Promise.reject(new Error('Projects unavailable'))
        : Promise.resolve(mocks.projects),
    ),
  },
}));

function renderPage(orgId = 'org-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter
      initialEntries={[`/super-admin/organisations/${orgId}/overview`]}
    >
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path="/super-admin/organisations/:organisationId"
            element={<OrganisationScopeLayout />}
          >
            <Route path="overview" element={<OrganisationDetailPage />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.detail = detailFixture();
  mocks.billingError = false;
  mocks.projectsError = false;
  mocks.activity = { data: [], total: 0, page: 1, limit: 5 };
});

afterEach(() => {
  cleanup();
});

describe('OrganisationDetailPage', () => {
  it('keeps overview context in Workspace Pulse and lifecycle actions in dedicated management card', async () => {
    mocks.detail = detailFixture({ description: 'Regional HVAC workspace' });
    renderPage();

    const pulseHeading = await screen.findByRole('heading', {
      name: 'Workspace Pulse',
    });
    const pulseCard = pulseHeading.closest('[data-slot="card"]');
    expect(pulseCard).not.toBeNull();
    expect(
      within(pulseCard as HTMLElement).getByRole('button', {
        name: 'Edit metadata',
      }),
    ).toBeInTheDocument();

    const mgmtHeading = await screen.findByRole('heading', {
      name: 'Organisation Management',
    });
    const mgmtCard = mgmtHeading.closest('[data-slot="card"]');
    expect(mgmtCard).not.toBeNull();
    expect(
      within(mgmtCard as HTMLElement).getByRole('button', {
        name: 'Hold work',
      }),
    ).toBeInTheDocument();
    expect(
      within(mgmtCard as HTMLElement).getByRole('button', {
        name: 'Impose payment hold',
      }),
    ).toBeInTheDocument();
    expect(
      within(mgmtCard as HTMLElement).getByRole('button', {
        name: 'Suspend organisation',
      }),
    ).toBeInTheDocument();
  });

  it('renders name, plan, owner, and sync health metrics', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Northwind HVAC' }),
    ).toBeInTheDocument();
    expect(screen.getByText('owner@northwind.example')).toBeInTheDocument();
    expect(screen.getByText('Active & Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Sync Engine Health')).toBeInTheDocument();
    expect(screen.getByText('Monthly Record Quota')).toBeInTheDocument();
  });

  it('shows a suspension banner when the organisation status is suspended', async () => {
    mocks.detail = detailFixture({ status: 'suspended' });
    renderPage();

    expect(
      await screen.findByText('Organisation Suspended'),
    ).toBeInTheDocument();
  });

  it('shows the payment hold banner and its matching management action', async () => {
    mocks.detail = detailFixture({
      paymentHoldActive: true,
      paymentHoldSince: '2026-10-10T00:00:00.000Z',
      manualHoldReason: 'Payment review',
    });
    renderPage();

    expect(
      await screen.findByText('Payment / Billing Hold Active'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear Payment Hold' }),
    ).toBeInTheDocument();
    const clearHoldAction = screen.getByRole('button', {
      name: 'Clear payment hold',
    });
    fireEvent.click(clearHoldAction);
    expect(
      await screen.findByRole('dialog', { name: 'Clear payment hold' }),
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

    expect(await screen.findByText('Over plan: projects')).toBeInTheDocument();
  });

  it('links back to the organisations list', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind HVAC' });

    const backLink = screen.getByRole('link', { name: 'Organisations' });
    expect(backLink).toHaveAttribute('href', '/super-admin/organisations');
  });

  it('keeps core context available when billing preview fails', async () => {
    mocks.billingError = true;
    renderPage();

    expect(await screen.findByText('Workspace Pulse')).toBeInTheDocument();
    expect(
      await screen.findByText('Sync Engine Health'),
    ).toBeInTheDocument();
  });

  it('allows dismissing account warnings for the session', async () => {
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

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
  });
});
