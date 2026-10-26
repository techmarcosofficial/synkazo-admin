import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import OrganisationProjectsPage from './OrganisationProjectsPage';
import { TooltipProvider } from '@/components/ui/tooltip';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/apiClient', () => ({ default: api }));
vi.mock('@/lib/toast', () => ({ showToast: { success: vi.fn() } }));

const project = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'Customer sync',
  description: null,
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  status: 'active',
  jobCount: 2,
  enabledJobCount: 1,
  lastSyncedAt: null,
};
const catalog = [
  {
    platformId: 'servicetitan',
    label: 'ServiceTitan',
    supportsOAuth: false,
    supportsEnvironments: true,
  },
  {
    platformId: 'hubspot',
    label: 'HubSpot',
    supportsOAuth: true,
    supportsEnvironments: true,
  },
];
let rows = [project];

// Radix Select uses browser APIs that jsdom does not implement.
const selectBrowserMethods = {
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
};
const originalBrowserMethods = new Map(
  Object.keys(selectBrowserMethods).map((name) => [
    name,
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
  ]),
);

function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderDirectory() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(['superAdmin', 'other-org', 'projects'], {
    untouched: true,
  });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter
          initialEntries={['/super-admin/organisations/org-1/projects']}
        >
          <Routes>
            <Route
              path="/super-admin/organisations/:organisationId/projects"
              element={<OrganisationProjectsPage />}
            />
            <Route
              path="/super-admin/organisations/:organisationId/projects/:projectId"
              element={<p>Created project workspace</p>}
            />
          </Routes>
          <Location />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return client;
}

async function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));
  const dialog = screen.getByRole('dialog');
  await within(dialog).findByRole('radio', { name: /ServiceTitan/i });
  return dialog;
}

async function fillProject(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText(/Project Name/), {
    target: { value: '  Field service CRM  ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Optional Note'), {
    target: { value: 'Customer contacts' },
  });
  fireEvent.click(within(dialog).getByRole('radio', { name: /ServiceTitan/i }));
  fireEvent.click(within(dialog).getByRole('radio', { name: /Two Way/i }));
}

beforeEach(() => {
  for (const [name, value] of Object.entries(selectBrowserMethods)) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      value,
    });
  }
  rows = [project];
  vi.clearAllMocks();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  api.get.mockImplementation((path: string) =>
    Promise.resolve({
      data:
        path === '/platforms'
          ? { data: catalog }
          : path.endsWith('/projects')
            ? { data: rows, total: rows.length, page: 1, limit: 10 }
            : { data: { id: 'org-1', name: 'Northwind' } },
    }),
  );
  api.post.mockResolvedValue({
    data: { success: true, data: { id: 'new-project' } },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const [name, descriptor] of originalBrowserMethods) {
    if (descriptor)
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

describe('Organisation project directory', () => {
  it.each([
    ['Draft', 'draft'],
    ['Active', 'active'],
    ['Paused', 'paused'],
    ['Error', 'error'],
  ])(
    'filters by %s using the supported scoped API status',
    async (label, status) => {
      const user = userEvent.setup();
      renderDirectory();
      await screen.findAllByText('Customer sync');
      await user.click(
        screen.getByRole('combobox', { name: 'Filter projects by status' }),
      );
      const options = screen.getAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([
        'All statuses',
        'Draft',
        'Active',
        'Paused',
        'Error',
      ]);
      await user.click(
        screen.getByRole('option', { name: label }),
      );
      await waitFor(() =>
        expect(api.get).toHaveBeenCalledWith(
          '/super-admin/organisations/org-1/projects',
          { params: expect.objectContaining({ status, page: 1 }) },
        ),
      );
      await user.click(
        screen.getByRole('combobox', { name: 'Filter projects by status' }),
      );
      await user.click(screen.getByRole('option', { name: 'All statuses' }));
      await waitFor(() =>
        expect(api.get).toHaveBeenLastCalledWith(
          '/super-admin/organisations/org-1/projects',
          { params: expect.objectContaining({ status: undefined }) },
        ),
      );
    },
  );

  it('distinguishes status sorting from the status filter', async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findAllByText('Customer sync');
    await user.click(screen.getByRole('combobox', { name: 'Sort projects' }));
    expect(
      screen.queryByRole('option', { name: 'Status' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Status: A–Z' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        '/super-admin/organisations/org-1/projects',
        {
          params: expect.objectContaining({
            sortBy: 'status',
            sortOrder: 'asc',
          }),
        },
      ),
    );
  });

  it('uses the shared directory header with results outside it and lazily loads creation options', async () => {
    renderDirectory();
    expect(
      (await screen.findAllByText('Customer sync'))[0],
    ).toBeInTheDocument();
    const header = screen
      .getByRole('heading', { name: 'Projects' })
      .closest('header')!;
    expect(
      within(header).getByRole('button', { name: 'Create Project' }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole('textbox', { name: 'Search projects' }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole('combobox', {
        name: 'Filter projects by status',
      }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole('combobox', { name: 'Sort projects' }),
    ).toBeInTheDocument();
    expect(header).not.toContainElement(
      screen.getAllByText('Customer sync')[0],
    );
    expect(api.get).not.toHaveBeenCalledWith('/platforms');
  });

  it('keeps creation available for an organisation with no projects', async () => {
    rows = [];
    renderDirectory();
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(await openCreate()).toHaveTextContent('for Northwind');
  });

  it('validates required inputs before sending a create request', async () => {
    renderDirectory();
    const dialog = await openCreate();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    );
    expect(
      await screen.findByText('Project name must be at least 2 characters.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please select a source platform.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Please choose a sync mode.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates in the selected organisation, refreshes its caches and opens the scoped workspace', async () => {
    const client = renderDirectory();
    client.setQueryData(['superAdmin', 'org-1', 'activity'], []);
    const dialog = await openCreate();
    await fillProject(dialog);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    );
    expect(
      await screen.findByText('Created project workspace'),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/super-admin/organisations/org-1/projects',
      {
        name: 'Field service CRM',
        description: 'Customer contacts',
        sourcePlatformId: 'servicetitan',
        destPlatformId: 'hubspot',
        syncMode: 'two_way',
      },
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/super-admin/organisations/org-1/projects/new-project',
    );
    expect(
      client.getQueryState(['superAdmin', 'org-1', 'activity'])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(['superAdmin', 'other-org', 'projects'])
        ?.isInvalidated,
    ).toBe(false);
    expect(
      api.get.mock.calls.every(
        ([path]) => path === '/platforms' || path.startsWith('/super-admin/'),
      ),
    ).toBe(true);
  });

  it('prevents duplicate submission and dismissal while creating', async () => {
    let finish!: (value: unknown) => void;
    api.post.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderDirectory();
    const dialog = await openCreate();
    await fillProject(dialog);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    );
    const submitting = await within(dialog).findByRole('button', {
      name: /Creating…/,
    });
    expect(submitting).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    fireEvent.click(submitting);
    expect(api.post).toHaveBeenCalledTimes(1);
    finish({ data: { data: { id: 'new-project' } } });
    await screen.findByText('Created project workspace');
  });

  it('preserves inputs on failure and allows a successful retry', async () => {
    api.post.mockRejectedValueOnce(
      new Error('Project creation is temporarily unavailable.'),
    );
    renderDirectory();
    const dialog = await openCreate();
    await fillProject(dialog);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Project creation is temporarily unavailable.',
    );
    expect(within(dialog).getByLabelText(/Project Name/)).toHaveValue(
      '  Field service CRM  ',
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    );
    await screen.findByText('Created project workspace');
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('blocks creation when the platform catalog fails and offers retry', async () => {
    api.get.mockImplementation((path: string) =>
      path === '/platforms'
        ? Promise.reject(new Error('Offline'))
        : Promise.resolve({
            data: path.endsWith('/projects')
              ? { data: [], total: 0 }
              : { data: { name: 'Northwind' } },
          }),
    );
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText('Could not load project platforms');
    expect(
      within(dialog).getByRole('button', { name: 'Create Project' }),
    ).toBeDisabled();
    api.get.mockResolvedValue({ data: { data: catalog } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    await within(dialog).findByRole('radio', { name: /ServiceTitan/i });
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Create Project' }),
      ).not.toBeDisabled(),
    );
  });
});
