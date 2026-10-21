import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrganisationProjectConnections from './OrganisationProjectConnections';
import { TooltipProvider } from '@/components/ui/tooltip';
import type {
  SuperAdminProjectConnection,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';
import { redirectToOAuth } from '@/lib/oauthRedirect';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('@/api/apiClient', () => ({ default: api }));
vi.mock('@/lib/oauthRedirect', () => ({ redirectToOAuth: vi.fn() }));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: (role: string) => role === 'super_admin' }),
}));
const root = '/super-admin/organisations/org-1/projects/project-1/connections';
const project: SuperAdminProjectDetail = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'CRM sync',
  description: null,
  status: 'active',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  jobCount: 0,
  enabledJobCount: 0,
  lastSyncedAt: null,
  createdAt: '',
  updatedAt: '',
  schedulerMode: 'interval',
  activeEnvironment: 'sandbox',
  environmentActivatedAt: '2026-01-01T00:00:00Z',
  totalRecordsSynced: 0,
  totalErrorCount: 0,
};
const source: SuperAdminProjectConnection = {
  id: 'source-1',
  platformId: 'servicetitan',
  connectionType: 'source',
  environment: 'sandbox',
  status: 'connected',
  accountName: 'Customer account',
  connectedAt: null,
  lastCheckedAt: null,
};
const destination: SuperAdminProjectConnection = {
  ...source,
  id: 'hubspot-1',
  platformId: 'hubspot',
  connectionType: 'destination',
};
let rows: SuperAdminProjectConnection[];

function Location() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}
function renderBoard(search = '?tab=connections') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter
          initialEntries={[
            `/super-admin/organisations/org-1/projects/project-1${search}`,
          ]}
        >
          <OrganisationProjectConnections
            organisationId="org-1"
            organisationName="Northwind"
            project={project}
            jobs={[]}
            onContinue={vi.fn()}
          />
          <Location />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  rows = [source];
  api.get.mockImplementation((path: string) =>
    Promise.resolve({
      data: {
        data:
          path === root
            ? rows
            : path.endsWith('/credentials-preview')
              ? { clientId: 'id', appKey: 'app', tenantId: 'tenant' }
              : {
                  platformId: 'hubspot',
                  kind: 'hubspot_oauth',
                  scopes: [],
                  status: 'connected',
                },
      },
    }),
  );
  api.post.mockImplementation((path: string) =>
    Promise.resolve({
      data: {
        data: path.endsWith('/test')
          ? { success: true, message: 'Verified' }
          : { redirectUrl: 'https://app.hubspot.com/authorize' },
      },
    }),
  );
  api.patch.mockImplementation(() =>
    Promise.resolve({ data: { data: source } }),
  );
  api.delete.mockImplementation(() => {
    rows = [source];
    return Promise.resolve({ data: { data: { removed: true } } });
  });
});
afterEach(cleanup);

describe('Super Admin project Connections', () => {
  it('uses scoped APIs and starts HubSpot immediately without a method popup or tenant requests', async () => {
    renderBoard();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect HubSpot' }),
    );
    await waitFor(() =>
      expect(redirectToOAuth).toHaveBeenCalledWith(
        'https://app.hubspot.com/authorize',
      ),
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(`${root}/hubspot/oauth`, {
      connectionType: 'destination',
      environment: 'sandbox',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Manual Setup')).not.toBeInTheDocument();
    expect(
      api.get.mock.calls.every(([path]) =>
        path.startsWith('/super-admin/organisations/org-1/'),
      ),
    ).toBe(true);
  });

  it('reconnects an existing legacy or OAuth HubSpot connection through the scoped endpoint', async () => {
    rows.push(destination);
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Reconnect' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        `${root}/hubspot-1/hubspot/reconnect`,
      ),
    );
    expect(
      screen.queryByPlaceholderText('Enter your HubSpot access token'),
    ).not.toBeInTheDocument();
  });

  it('edits other platform credentials through scoped preview, update and verification', async () => {
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(
        within(dialog).getByPlaceholderText('Enter your client ID'),
      ).toHaveValue('id'),
    );
    fireEvent.change(
      within(dialog).getByPlaceholderText(
        'Leave blank to keep existing secret',
      ),
      { target: { value: 'new-secret' } },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(`${root}/source-1/test`),
    );
    expect(api.patch).toHaveBeenCalledWith(
      `${root}/source-1`,
      expect.objectContaining({
        credentials: {
          appKey: 'app',
          clientId: 'id',
          tenantId: 'tenant',
          clientSecret: 'new-secret',
        },
      }),
    );
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty('status');
    expect(api.get).toHaveBeenCalledWith(
      `${root}/source-1/credentials-preview`,
    );
  });

  it('requires project confirmation and reason for a scoped disconnect', async () => {
    rows.push(destination);
    renderBoard();
    const buttons = await screen.findAllByRole('button', {
      name: 'Disconnect',
    });
    fireEvent.click(buttons[1]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Northwind · CRM sync · sandbox');
    const submit = within(dialog).getByRole('button', { name: 'Disconnect' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Type.*CRM sync/), {
      target: { value: 'CRM sync' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Reason/), {
      target: { value: 'Customer requested reconnection' },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(`${root}/hubspot-1`, {
        data: {
          confirmation: 'CRM sync',
          reason: 'Customer requested reconnection',
        },
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      api.get.mock.calls.every(([path]) => !path.startsWith('/projects/')),
    ).toBe(true);
  });

  it.each([
    'connected=hubspot',
    'hubspot_error=access_denied',
    'rescoped=hubspot-1&added=1&removed=0',
  ])(
    'preserves the Connections tab and selected environment on return: %s',
    async (flags) => {
      renderBoard(`?tab=connections&env=production&${flags}`);
      await waitFor(() =>
        expect(screen.getByTestId('search')).toHaveTextContent(
          '?tab=connections',
        ),
      );
      expect(screen.getByTestId('search').textContent).toBe('?tab=connections');
      expect(screen.getByText('Production (Live)')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('shows a load error instead of offering setup against unknown connection state', async () => {
    api.get.mockRejectedValue(new Error('Offline'));
    renderBoard();
    expect(
      await screen.findByText('Could not load connections'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Connect HubSpot' }),
    ).not.toBeInTheDocument();
    api.get.mockResolvedValue({ data: { data: [source] } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('button', { name: 'Connect HubSpot' });
  });
});
