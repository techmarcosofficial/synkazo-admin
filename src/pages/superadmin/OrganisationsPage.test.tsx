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

import OrganisationsPage from './OrganisationsPage';

import type { SuperAdminOrganisationListItem, SuperAdminPage } from '@/types';

const listRow = (
  overrides: Partial<SuperAdminOrganisationListItem> = {},
): SuperAdminOrganisationListItem => ({
  id: 'org-1',
  name: 'Northwind HVAC',
  slug: 'northwind',
  status: 'active',
  subscriptionStatus: 'active',
  owner: {
    id: 'user-1',
    email: 'owner@northwind.example',
    fullName: 'Owner Name',
    isActive: true,
  },
  plan: { id: 'plan-pro', name: 'Pro' },
  memberCount: 8,
  projectCount: 3,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mocks = vi.hoisted(() => ({
  page: null as SuperAdminPage<SuperAdminOrganisationListItem> | null,
  error: null as Error | null,
  lastParams: undefined as unknown,
}));

vi.mock('@/api/superAdminOrganisations', () => ({
  superAdminOrganisationsApi: {
    list: vi.fn((params: unknown) => {
      mocks.lastParams = params;
      if (mocks.error) return Promise.reject(mocks.error);
      return Promise.resolve(mocks.page);
    }),
  },
}));

vi.mock('@/queries/useBilling', () => ({
  useAdminPlansQuery: () => ({
    data: [
      { id: 'plan-starter', name: 'Starter' },
      { id: 'plan-pro', name: 'Pro' },
    ],
    isLoading: false,
  }),
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path="/super-admin/organisations"
            element={<OrganisationsPage />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.page = { data: [listRow()], total: 1, page: 1, limit: 10 };
  mocks.error = null;
  mocks.lastParams = undefined;
});

afterEach(() => {
  cleanup();
});

describe('OrganisationsPage', () => {
  it('opens organisation details from the default card and the list view', async () => {
    renderAt('/super-admin/organisations');

    expect(await screen.findByText('Northwind HVAC')).toBeInTheDocument();
    const directoryHeading = screen.getByRole('heading', {
      level: 1,
      name: 'Organisations',
    });
    const pageHeader = directoryHeading.closest('header');
    expect(pageHeader).not.toBeNull();
    const results = screen.getByRole('region', {
      name: 'Organisation results',
    });
    expect(
      within(pageHeader as HTMLElement).getByRole('button', {
        name: 'Provision organisation',
      }),
    ).toBeInTheDocument();
    expect(
      within(pageHeader as HTMLElement).getByText(
        'Review status, billing, and customer workspaces.',
      ),
    ).toBeInTheDocument();
    expect(
      within(pageHeader as HTMLElement).getByLabelText('1 organisation total'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Manage organisations')).not.toBeInTheDocument();
    expect(
      screen.getByText('Owner: owner@northwind.example'),
    ).toBeInTheDocument();
    expect(screen.getByText('Plan: Pro')).toBeInTheDocument();
    expect(screen.getByText('View organisation')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    const nameLink = screen.getByText('Northwind HVAC').closest('a');
    expect(nameLink).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/overview',
    );

    fireEvent.click(screen.getByLabelText('List view'));
    const tableCard = screen.getByRole('table').closest('[data-slot="card"]');
    expect(tableCard).not.toBeNull();
    expect(tableCard).not.toContainElement(pageHeader);
    expect(screen.getByText('owner@northwind.example')).toBeInTheDocument();
  });

  it('forwards status URL params to the query so deep-links pre-filter', async () => {
    renderAt('/super-admin/organisations?status=suspended');
    await screen.findByText('Northwind HVAC');
    expect((mocks.lastParams as { status?: string })?.status).toBe('suspended');
  });

  it('clears a directory search from the search field', async () => {
    renderAt('/super-admin/organisations?search=northwind');
    await screen.findByText('Northwind HVAC');

    const search = screen.getByRole('textbox', {
      name: 'Search organisations',
    });
    expect(search).toHaveValue('northwind');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(search).toHaveValue('');
  });

  it('forwards subscriptionStatus URL params to the query', async () => {
    renderAt('/super-admin/organisations?subscriptionStatus=past_due');
    await screen.findByText('Northwind HVAC');
    expect(
      (mocks.lastParams as { subscriptionStatus?: string })?.subscriptionStatus,
    ).toBe('past_due');
  });

  it('forwards planId URL params to the query', async () => {
    renderAt('/super-admin/organisations?planId=plan-pro');
    await screen.findByText('Northwind HVAC');
    expect((mocks.lastParams as { planId?: string })?.planId).toBe('plan-pro');
  });

  it('forwards planId=unassigned to the query', async () => {
    renderAt('/super-admin/organisations?planId=unassigned');
    await screen.findByText('Northwind HVAC');
    expect((mocks.lastParams as { planId?: string })?.planId).toBe('unassigned');
  });

  it('renders filter controls and clear filters button next to filters when active', async () => {
    renderAt('/super-admin/organisations?planId=plan-pro');
    await screen.findByText('Northwind HVAC');

    const statusFilter = screen.getByRole('combobox', {
      name: 'Filter organisations by status',
    });
    const billingFilter = screen.getByRole('combobox', {
      name: 'Filter organisations by billing status',
    });
    const planFilter = screen.getByRole('combobox', {
      name: 'Filter organisations by plan',
    });
    const sortSelect = screen.getByRole('combobox', {
      name: 'Sort organisations',
    });

    expect(statusFilter).toBeInTheDocument();
    expect(billingFilter).toBeInTheDocument();
    expect(planFilter).toBeInTheDocument();
    expect(sortSelect).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: 'Clear filters' });
    expect(clearButton).toBeInTheDocument();

    // Verify sort dropdown comes before clear filters button in DOM order
    expect(
      Boolean(
        sortSelect.compareDocumentPosition(clearButton) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);

    fireEvent.click(clearButton);
    expect((mocks.lastParams as { planId?: string })?.planId).toBeUndefined();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();
  });

  it('renders an error state with a retry action when the list call fails', async () => {
    mocks.page = null;
    mocks.error = new Error('backend unavailable');

    renderAt('/super-admin/organisations');

    expect(
      await screen.findByText('Could not load organisations'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders an empty state when the list is genuinely empty', async () => {
    mocks.page = { data: [], total: 0, page: 1, limit: 10 };

    renderAt('/super-admin/organisations');

    expect(await screen.findByText('No organisations yet')).toBeInTheDocument();
  });
});
