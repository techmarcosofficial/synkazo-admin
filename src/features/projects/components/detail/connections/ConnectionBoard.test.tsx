import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConnectionBoard from './ConnectionBoard';
import { connectionsApi } from '@/api/connections';
import type { Connection } from '@/types';

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    listProjectConnections: vi.fn(),
    getCredentialsPreview: vi.fn(),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    testConnection: vi.fn(),
    getHubSpotOAuthUrl: vi.fn(),
  },
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => true }),
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

afterEach(cleanup);

describe('ConnectionBoard credential journey', () => {
  let connections: Connection[];
  let sourceTests: number;

  const renderBoard = (onContinue = vi.fn()) =>
    render(
      <MemoryRouter initialEntries={['/projects/proj-1?tab=connections']}>
        <ConnectionBoard
          projectId="proj-1"
          sourcePlatformId="servicetitan"
          destPlatformId="hubspot"
          projectActiveEnv="sandbox"
          onContinue={onContinue}
        />
      </MemoryRouter>,
    );

  const fillServiceTitanCredentials = () => {
    fireEvent.change(screen.getByPlaceholderText('Enter your client ID'), {
      target: { value: 'client-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your client secret'), {
      target: { value: 'secret-1' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Enter your application key'),
      {
        target: { value: 'app-key-1' },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '12345' },
    });
  };

  const sourceCard = () =>
    screen.getByText('Connect source').closest('[data-border-state]');
  const destinationCard = () =>
    screen.getByText('Connect destination').closest('[data-border-state]');

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    connections = [];
    sourceTests = 0;
    vi.mocked(connectionsApi.listProjectConnections).mockImplementation(
      async () => connections.map((connection) => ({ ...connection })),
    );
    vi.mocked(connectionsApi.getCredentialsPreview).mockResolvedValue({
      clientId: 'client-1',
      clientSecret: 'secret-1',
      appKey: 'app-key-1',
      tenantId: '12345',
    });
    vi.mocked(connectionsApi.createConnection).mockImplementation(
      async (_projectId, payload) => {
        const connection = {
          ...payload,
          id: `conn-${connections.length + 1}`,
          projectId: 'proj-1',
          status: 'disconnected',
        } as Connection;
        connections.push(connection);
        return connection;
      },
    );
    vi.mocked(connectionsApi.updateConnection).mockImplementation(
      async (_projectId, id, payload) => {
        const connection = connections.find((item) => item.id === id)!;
        Object.assign(connection, payload);
        return connection;
      },
    );
    vi.mocked(connectionsApi.testConnection).mockImplementation(
      async (_projectId, id) => {
        const connection = connections.find((item) => item.id === id)!;
        if (id === 'conn-1') sourceTests += 1;
        const failed = id === 'conn-1' && sourceTests === 1;
        connection.status = failed ? 'error' : 'connected';
        return {
          success: !failed,
          message: failed ? 'ServiceTitan rejected the client ID' : 'Connected',
        };
      },
    );
  });

  it('retains a source error after closing and reopening Fix, then shows success only for the verified pair', async () => {
    const onContinue = vi.fn();
    const firstView = renderBoard(onContinue);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect ServiceTitan' }),
    );
    fillServiceTitanCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('ServiceTitan rejected the client ID'),
    ).toBeInTheDocument();
    expect(sourceCard()).toHaveAttribute('data-border-state', 'error');
    expect(sourceCard()).toHaveClass('border-destructive/70');
    expect(
      screen.queryByText(/both sandbox connections are ready/i),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('button', { name: 'Update Credentials' });
    expect(connections[0].status).toBe('error');

    // Navigation remounts the board, while this browser session keeps the server error.
    firstView.unmount();
    renderBoard(onContinue);
    await screen.findByRole('button', { name: 'Update Credentials' });
    fireEvent.click((await screen.findByText('Fix')).closest('button')!);
    expect(
      await screen.findByText('ServiceTitan rejected the client ID'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }));

    await waitFor(() => {
      expect(
        screen.queryByText('ServiceTitan rejected the client ID'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Connect HubSpot' }),
      ).toBeEnabled();
    });
    expect(
      screen.queryByText(/both sandbox connections are ready/i),
    ).not.toBeInTheDocument();
    expect(connectionsApi.createConnection).toHaveBeenCalledTimes(1);
    expect(sourceCard()).toHaveAttribute('data-border-state', 'success');
    expect(sourceCard()).toHaveClass('border-success');

    fireEvent.click(screen.getByRole('button', { name: 'Connect HubSpot' }));
    fireEvent.click(screen.getByRole('button', { name: /Manual Setup/i }));
    fireEvent.change(
      screen.getByPlaceholderText('Enter your HubSpot access token'),
      {
        target: { value: 'pat-1' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Sandbox connections ready'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(destinationCard()).toHaveAttribute('data-border-state', 'success'),
    );
    expect(
      screen.queryByText('Connections Ready · Project Active'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create Sync Flow' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('keeps a saved connection recoverable when verification cannot reach the server', async () => {
    vi.mocked(connectionsApi.testConnection).mockRejectedValueOnce(
      new Error('ServiceTitan is temporarily unreachable'),
    );
    renderBoard();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect ServiceTitan' }),
    );
    fillServiceTitanCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(
      await screen.findByText('ServiceTitan is temporarily unreachable'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(
      await screen.findByRole('button', { name: 'Update Credentials' }),
    );
    expect(
      await screen.findByText('ServiceTitan is temporarily unreachable'),
    ).toBeInTheDocument();
    sourceTests = 1;
    fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Connect HubSpot' }),
      ).toBeEnabled(),
    );
    expect(connectionsApi.createConnection).toHaveBeenCalledTimes(1);
    expect(connectionsApi.updateConnection).toHaveBeenCalledTimes(1);
  });

  it('keeps the rotating border during form verification and resets a success border after three seconds', async () => {
    let finishTest!: () => void;
    vi.mocked(connectionsApi.testConnection).mockImplementationOnce(
      (_projectId, id) =>
        new Promise((resolve) => {
          finishTest = () => {
            connections.find((connection) => connection.id === id)!.status =
              'error';
            resolve({ success: false, message: 'Client ID rejected' });
          };
        }),
    );
    renderBoard();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect ServiceTitan' }),
    );
    fillServiceTitanCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await screen.findByRole('button', { name: /verifying with server/i });
    expect(sourceCard()).toHaveAttribute('data-border-state', 'testing');
    expect(
      sourceCard()!.querySelector('[data-slot="border-beam"]'),
    ).not.toBeNull();

    await act(async () => finishTest());
    expect(await screen.findByText('Client ID rejected')).toBeInTheDocument();
    expect(sourceCard()).toHaveAttribute('data-border-state', 'error');

    sourceTests = 1;
    fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }));
    await waitFor(() =>
      expect(sourceCard()).toHaveAttribute('data-border-state', 'success'),
    );
    expect(sourceCard()).toHaveClass('border-success');

    await waitFor(
      () =>
        expect(sourceCard()).toHaveAttribute('data-border-state', 'connected'),
      { timeout: 4500 },
    );
    expect(sourceCard()).not.toHaveClass('border-success');
  });

  it('updates the same border after a direct Retest succeeds or fails', async () => {
    connections.push({
      id: 'conn-1',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'sandbox',
      status: 'connected',
    });
    sourceTests = 1;
    renderBoard();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Retest ServiceTitan' }),
    );
    await waitFor(() =>
      expect(sourceCard()).toHaveAttribute('data-border-state', 'success'),
    );

    vi.mocked(connectionsApi.testConnection).mockImplementationOnce(
      async () => {
        connections[0].status = 'error';
        return { success: false, message: 'ServiceTitan credentials expired' };
      },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Retest ServiceTitan' }),
    );
    await waitFor(() =>
      expect(sourceCard()).toHaveAttribute('data-border-state', 'error'),
    );
    expect(sourceCard()).toHaveClass('border-destructive/70');
  });
});
