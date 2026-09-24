import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
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
  it('renders the table and links each row to the detail page', async () => {
    renderAt('/super-admin/organisations');

    expect(await screen.findByText('Northwind HVAC')).toBeInTheDocument();
    expect(screen.getByText('owner@northwind.example')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();

    const nameLink = screen.getByText('Northwind HVAC').closest('a');
    expect(nameLink).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/overview',
    );
  });

  it('forwards status URL params to the query so deep-links pre-filter', async () => {
    renderAt('/super-admin/organisations?status=suspended');
    await screen.findByText('Northwind HVAC');
    expect((mocks.lastParams as { status?: string })?.status).toBe(
      'suspended',
    );
  });

  it('forwards subscriptionStatus URL params to the query', async () => {
    renderAt('/super-admin/organisations?subscriptionStatus=past_due');
    await screen.findByText('Northwind HVAC');
    expect(
      (mocks.lastParams as { subscriptionStatus?: string })?.subscriptionStatus,
    ).toBe('past_due');
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

    expect(
      await screen.findByText('No organisations match your filters'),
    ).toBeInTheDocument();
  });
});
