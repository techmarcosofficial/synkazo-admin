import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import PlatformCard from './PlatformCard';
import type { ExtConnection } from '@/components/connections/types';

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: () => true,
    currentUser: { id: 'u1', role: 'org_admin' },
  }),
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn(),
  }),
}));

vi.mock('@/components/connections/useConnectionTestAndDisconnect', () => ({
  useConnectionTestAndDisconnect: () => ({
    testing: false,
    testResult: null,
    handleTest: vi.fn(),
    handleDisconnect: vi.fn(),
  }),
}));

afterEach(cleanup);

describe('PlatformCard Progressive Disclosure', () => {
  const onConnectMock = vi.fn();
  const onUpdatedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders slot state with only Connect CTA', () => {
    const slotConn: ExtConnection = {
      id: '',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'production',
      status: 'disconnected',
    };

    render(
      <MemoryRouter>
        <PlatformCard
          conn={slotConn}
          onConnect={onConnectMock}
          onUpdated={onUpdatedMock}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: /connect servicetitan/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /update credentials/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /permissions/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /disconnect/i }),
    ).not.toBeInTheDocument();
  });

  it('renders error state with Update Credentials and Remove, hiding Test and Permissions', () => {
    const errorConn: ExtConnection = {
      id: 'conn-1',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'production',
      status: 'error',
      accountName: 'Acme HVAC',
    };

    render(
      <MemoryRouter>
        <PlatformCard
          conn={errorConn}
          onConnect={onConnectMock}
          onUpdated={onUpdatedMock}
        />
      </MemoryRouter>,
    );

    // Primary action to fix credentials
    expect(
      screen.getByRole('button', { name: /update credentials/i }),
    ).toBeInTheDocument();
    // Secondary action to remove failed setup
    expect(
      screen.getByRole('button', { name: /remove/i }),
    ).toBeInTheDocument();

    // Redundant or invalid actions must be HIDDEN
    expect(
      screen.queryByRole('button', { name: /retest|test servicetitan/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /permissions/i }),
    ).not.toBeInTheDocument();

    // Helpful error banner
    expect(
      screen.getByText(/connection verification failed or credentials expired/i),
    ).toBeInTheDocument();
  });

  it('renders connected state with Permissions, Edit, Disconnect, and Retest', () => {
    const connectedConn: ExtConnection = {
      id: 'conn-2',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'production',
      status: 'connected',
      accountName: 'Acme HVAC',
    };

    render(
      <MemoryRouter>
        <PlatformCard
          conn={connectedConn}
          onConnect={onConnectMock}
          onUpdated={onUpdatedMock}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: /permissions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /edit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /disconnect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retest/i }),
    ).toBeInTheDocument();

    // No error banner
    expect(
      screen.queryByText(/connection verification failed or credentials expired/i),
    ).not.toBeInTheDocument();
  });

  it('calls onTestingChange with testing status', () => {
    const onTestingChangeMock = vi.fn();
    const connectedConn: ExtConnection = {
      id: 'conn-2',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'production',
      status: 'connected',
    };

    render(
      <MemoryRouter>
        <PlatformCard
          conn={connectedConn}
          onConnect={onConnectMock}
          onUpdated={onUpdatedMock}
          onTestingChange={onTestingChangeMock}
        />
      </MemoryRouter>,
    );

    expect(onTestingChangeMock).toHaveBeenCalledWith(false);
  });

  it('hides error notice and displays verifying state when isTesting is true', () => {
    const errorConn: ExtConnection = {
      id: 'conn-1',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      connectionType: 'source',
      environment: 'production',
      status: 'error',
      accountName: 'Acme HVAC',
    };

    render(
      <MemoryRouter>
        <PlatformCard
          conn={errorConn}
          onConnect={onConnectMock}
          onUpdated={onUpdatedMock}
          isTesting={true}
        />
      </MemoryRouter>,
    );

    // Error banner and Action Required MUST NOT appear while verifying
    expect(
      screen.queryByText(/connection verification failed or credentials expired/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/action required/i),
    ).not.toBeInTheDocument();

    // Verifying state should be visible in subtitle and action button
    expect(screen.getByText(/verifying credentials…/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verifying…/i })).toBeDisabled();
  });
});
