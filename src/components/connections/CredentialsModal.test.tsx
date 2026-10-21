import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CredentialsModal from './CredentialsModal';
import { connectionsApi } from '@/api/connections';
import type { Connection } from '@/types';

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    getCredentialsPreview: vi.fn().mockResolvedValue({}),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    testConnection: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(cleanup);

describe('CredentialsModal In-Modal Verification', () => {
  const onCloseMock = vi.fn();
  const onSavedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps modal open and displays inline error when credential verification fails', async () => {
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-new-1',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      status: 'disconnected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: false,
      message: 'Invalid client key for ServiceTitan API',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'servicetitan',
          connectionType: 'source',
          environment: 'production',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Fill in required fields for ServiceTitan
    fireEvent.change(screen.getByPlaceholderText('Enter your client ID'), {
      target: { value: 'bad-client-id' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your client secret'), {
      target: { value: 'bad-secret' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Enter your application key'),
      {
        target: { value: 'bad-key' },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '12345' },
    });

    // Click verify
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    // Verify modal does NOT close
    await waitFor(() => {
      expect(connectionsApi.testConnection).toHaveBeenCalledWith(
        'proj-1',
        'conn-new-1',
      );
    });

    // Error is displayed inline inside the modal
    expect(await screen.findByText('Verification Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Invalid client key for ServiceTitan API'),
    ).toBeInTheDocument();
    expect(screen.getByText('Check Client ID value')).toBeInTheDocument();

    // Problematic input has destructive ring and border highlight
    const clientIdInput = screen.getByPlaceholderText('Enter your client ID');
    expect(clientIdInput).toHaveAttribute('aria-invalid', 'true');
    expect(clientIdInput.className).toMatch(/border-destructive/);
    expect(clientIdInput.className).toMatch(/ring-destructive/);

    // Modal was NOT closed
    expect(onCloseMock).not.toHaveBeenCalled();

    // Verify other fields are NOT marked as invalid
    const secretInput = screen.getByPlaceholderText('Enter your client secret');
    expect(secretInput).toHaveAttribute('aria-invalid', 'false');
    expect(
      screen.queryByText('Check Client Secret value'),
    ).not.toBeInTheDocument();

    // The same form remains available for a correction and retry.
    expect(
      screen.getByRole('button', { name: /retry verification/i }),
    ).toBeInTheDocument();
  });

  it('keeps the credential form visible through validation and server verification', async () => {
    let finishSave!: (value: Connection) => void;
    let finishTest!: (value: { success: boolean; message: string }) => void;
    vi.mocked(connectionsApi.createConnection).mockReturnValue(
      new Promise<Connection>((resolve) => {
        finishSave = resolve;
      }),
    );
    vi.mocked(connectionsApi.testConnection).mockReturnValue(
      new Promise((resolve) => {
        finishTest = resolve;
      }),
    );

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'dataforma',
          connectionType: 'source',
          environment: 'sandbox',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Enter your Dataforma API key'),
      {
        target: { value: 'invalid-token' },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText('Enter your company service code'),
      { target: { value: 'service-1' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(
      await screen.findByRole('button', { name: /validating/i }),
    ).toBeDisabled();
    expect(
      screen.getByPlaceholderText('Enter your Dataforma API key'),
    ).toHaveValue('invalid-token');

    finishSave({ id: 'conn-1' } as Connection);
    expect(
      await screen.findByRole('button', { name: /verifying with server/i }),
    ).toBeDisabled();
    expect(
      screen.getByPlaceholderText('Enter your Dataforma API key'),
    ).toHaveValue('invalid-token');

    finishTest({ success: false, message: 'Token rejected by Dataforma' });
    expect(
      await screen.findByText('Token rejected by Dataforma'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry verification/i }),
    ).toBeEnabled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('shows a retained connection error when Fix reopens the form', async () => {
    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          id: 'conn-1',
          platformId: 'servicetitan',
          connectionType: 'source',
          environment: 'sandbox',
        }}
        initialError="Invalid client key for ServiceTitan API"
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    expect(
      screen.getByText('Invalid client key for ServiceTitan API'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry verification/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('marks ONLY client ID red when error is invalid_client, leaving other fields clean', async () => {
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-st-err',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      status: 'disconnected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: false,
      message: 'ServiceTitan auth error: invalid_client',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'servicetitan',
          connectionType: 'source',
          environment: 'production',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your client ID'), {
      target: { value: 'cid.por9yv0fepoe9548yhorgog8q1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your client secret'), {
      target: { value: 'secret-val-123' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Enter your application key'),
      {
        target: { value: 'ak1.gnsaqrz29jw3k6473bhibpugf' },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '1293100835' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByText('Verification Failed')).toBeInTheDocument();
    expect(
      screen.getByText('ServiceTitan auth error: invalid_client'),
    ).toBeInTheDocument();

    // ONLY Client ID should be marked
    expect(screen.getByText('Check Client ID value')).toBeInTheDocument();
    const clientIdInput = screen.getByPlaceholderText('Enter your client ID');
    expect(clientIdInput).toHaveAttribute('aria-invalid', 'true');

    // App Key, Client Secret, and Tenant ID MUST NOT be marked
    expect(screen.queryByText('Check App Key value')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Check Client Secret value'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Check Tenant ID value')).not.toBeInTheDocument();

    const appKeyInput = screen.getByPlaceholderText(
      'Enter your application key',
    );
    expect(appKeyInput).toHaveAttribute('aria-invalid', 'false');

    const secretInput = screen.getByPlaceholderText('Enter your client secret');
    expect(secretInput).toHaveAttribute('aria-invalid', 'false');

    const tenantInput = screen.getByPlaceholderText('e.g. 1234567');
    expect(tenantInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('closes the source form after verification without showing the pair popup', async () => {
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-ok-1',
      projectId: 'proj-1',
      platformId: 'servicetitan',
      status: 'connected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Connection verified',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'servicetitan',
          connectionType: 'source',
          environment: 'production',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your client ID'), {
      target: { value: 'valid-client-id' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your client secret'), {
      target: { value: 'valid-secret' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Enter your application key'),
      {
        target: { value: 'valid-key' },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/connections ready/i)).not.toBeInTheDocument();
  });

  it('verifies Dataforma source credentials successfully on first connection', async () => {
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-dataforma-1',
      projectId: 'proj-1',
      platformId: 'dataforma',
      connectionType: 'source',
      status: 'connected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Dataforma connected and verified',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'dataforma',
          connectionType: 'source',
          environment: 'sandbox',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Fill in Dataforma private app token
    fireEvent.change(
      screen.getByPlaceholderText('Enter your Dataforma API key'),
      {
        target: { value: 'pat-eu1-12345678-abcd' },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText('Enter your company service code'),
      { target: { value: 'service-1' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/connections ready/i)).not.toBeInTheDocument();
  });

  it('shows the environment-specific pair confirmation and creates a sync flow on request', async () => {
    const onContinueMock = vi.fn();
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-dataforma-complete',
      projectId: 'proj-1',
      platformId: 'dataforma',
      connectionType: 'source',
      status: 'connected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Dataforma connected and verified',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'dataforma',
          connectionType: 'source',
          environment: 'sandbox',
        }}
        willCompleteBoth={true}
        onClose={onCloseMock}
        onSaved={onSavedMock}
        onContinue={onContinueMock}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Enter your Dataforma API key'),
      {
        target: { value: 'pat-eu1-12345678-abcd' },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText('Enter your company service code'),
      { target: { value: 'service-1' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(
      await screen.findByText('Sandbox connections ready'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Both connections verified. Your project activates automatically; create a sync flow next.',
      ),
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'xs');
    expect(dialog.querySelector('[data-slot="dialog-header"]')).not.toHaveClass(
      'border-b',
    );
    expect(dialog.querySelector('[data-slot="dialog-footer"]')).not.toHaveClass(
      'border-t',
    );

    const continueBtn = screen.getByRole('button', {
      name: /create sync flow/i,
    });
    expect(continueBtn).toBeInTheDocument();
    fireEvent.click(continueBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(onContinueMock).toHaveBeenCalledTimes(1);
  });

  it('never offers a manual HubSpot credential form', () => {
    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          platformId: 'hubspot',
          connectionType: 'destination',
          environment: 'sandbox',
        }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Enter your HubSpot access token'),
    ).not.toBeInTheDocument();
  });
});
