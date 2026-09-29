import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        conn={{ platformId: 'servicetitan', connectionType: 'source', environment: 'production' }}
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
    fireEvent.change(screen.getByPlaceholderText('Enter your application key'), {
      target: { value: 'bad-key' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '12345' },
    });

    // Click verify
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    // Verify modal does NOT close
    await waitFor(() => {
      expect(connectionsApi.testConnection).toHaveBeenCalledWith('proj-1', 'conn-new-1');
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
    expect(screen.queryByText('Check Client Secret value')).not.toBeInTheDocument();

    // The same form remains available for a correction and retry.
    expect(
      screen.getByRole('button', { name: /retry verification/i }),
    ).toBeInTheDocument();
  });

  it('keeps the credential form visible through validation and server verification', async () => {
    let finishSave!: (value: Connection) => void;
    let finishTest!: (value: { success: boolean; message: string }) => void;
    vi.mocked(connectionsApi.createConnection).mockReturnValue(
      new Promise<Connection>((resolve) => { finishSave = resolve; }),
    );
    vi.mocked(connectionsApi.testConnection).mockReturnValue(
      new Promise((resolve) => { finishTest = resolve; }),
    );

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your HubSpot access token'), {
      target: { value: 'invalid-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('button', { name: /validating/i })).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter your HubSpot access token')).toHaveValue('invalid-token');

    finishSave({ id: 'conn-1' } as Connection);
    expect(await screen.findByRole('button', { name: /verifying with server/i })).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter your HubSpot access token')).toHaveValue('invalid-token');

    finishTest({ success: false, message: 'Token rejected by HubSpot' });
    expect(await screen.findByText('Token rejected by HubSpot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry verification/i })).toBeEnabled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('shows a retained connection error when Fix reopens the form', async () => {
    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ id: 'conn-1', platformId: 'servicetitan', connectionType: 'source', environment: 'sandbox' }}
        initialError="Invalid client key for ServiceTitan API"
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    expect(screen.getByText('Invalid client key for ServiceTitan API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry verification/i })).toBeInTheDocument();
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
        conn={{ platformId: 'servicetitan', connectionType: 'source', environment: 'production' }}
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
    fireEvent.change(screen.getByPlaceholderText('Enter your application key'), {
      target: { value: 'ak1.gnsaqrz29jw3k6473bhibpugf' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 1234567'), {
      target: { value: '1293100835' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('ServiceTitan auth error: invalid_client')).toBeInTheDocument();

    // ONLY Client ID should be marked
    expect(screen.getByText('Check Client ID value')).toBeInTheDocument();
    const clientIdInput = screen.getByPlaceholderText('Enter your client ID');
    expect(clientIdInput).toHaveAttribute('aria-invalid', 'true');

    // App Key, Client Secret, and Tenant ID MUST NOT be marked
    expect(screen.queryByText('Check App Key value')).not.toBeInTheDocument();
    expect(screen.queryByText('Check Client Secret value')).not.toBeInTheDocument();
    expect(screen.queryByText('Check Tenant ID value')).not.toBeInTheDocument();

    const appKeyInput = screen.getByPlaceholderText('Enter your application key');
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
        conn={{ platformId: 'servicetitan', connectionType: 'source', environment: 'production' }}
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
    fireEvent.change(screen.getByPlaceholderText('Enter your application key'), {
      target: { value: 'valid-key' },
    });
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

  it('verifies HubSpot destination credentials successfully on first connection', async () => {
    vi.mocked(connectionsApi.createConnection).mockResolvedValue({
      id: 'conn-hubspot-1',
      projectId: 'proj-1',
      platformId: 'hubspot',
      connectionType: 'destination',
      status: 'connected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'HubSpot connected and verified',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Fill in HubSpot private app token
    fireEvent.change(screen.getByPlaceholderText('Enter your HubSpot access token'), {
      target: { value: 'pat-eu1-12345678-abcd' },
    });

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
      id: 'conn-hubspot-complete',
      projectId: 'proj-1',
      platformId: 'hubspot',
      connectionType: 'destination',
      status: 'connected',
    } as any);

    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'HubSpot connected and verified',
    });

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        willCompleteBoth={true}
        onClose={onCloseMock}
        onSaved={onSavedMock}
        onContinue={onContinueMock}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your HubSpot access token'), {
      target: { value: 'pat-eu1-12345678-abcd' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByText('Sandbox connections ready')).toBeInTheDocument();
    expect(
      screen.getByText('Both connections verified. Your project activates automatically; create a sync flow next.'),
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'xs');
    expect(dialog.querySelector('[data-slot="dialog-header"]')).not.toHaveClass('border-b');
    expect(dialog.querySelector('[data-slot="dialog-footer"]')).not.toHaveClass('border-t');

    const continueBtn = screen.getByRole('button', { name: /create sync flow/i });
    expect(continueBtn).toBeInTheDocument();
    fireEvent.click(continueBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(onContinueMock).toHaveBeenCalledTimes(1);
  });

  it('renders method selection view for new OAuth-capable platform and transitions to form on Manual Setup', async () => {
    const onOAuthMock = vi.fn();

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        onOAuth={onOAuthMock}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Initial view should be method selection
    expect(screen.getByText('Choose how to authenticate')).toBeInTheDocument();
    expect(screen.getByText('Manual Setup')).toBeInTheDocument();
    expect(screen.getByText('Login with HubSpot')).toBeInTheDocument();

    // Clicking "Manual Setup" replaces content in-place with the form
    fireEvent.click(screen.getByText('Manual Setup'));

    expect(screen.getByText('Enter your API credentials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your HubSpot access token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to authentication methods/i })).toBeInTheDocument();
  });

  it('preserves entered form inputs when returning to method selection via Back button', async () => {
    const onOAuthMock = vi.fn();

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        onOAuth={onOAuthMock}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Go to manual form
    fireEvent.click(screen.getByText('Manual Setup'));

    // Enter a token
    const tokenInput = screen.getByPlaceholderText('Enter your HubSpot access token');
    fireEvent.change(tokenInput, { target: { value: 'pat-preserved-value-123' } });
    expect(tokenInput).toHaveValue('pat-preserved-value-123');

    // Click "Back to authentication methods"
    fireEvent.click(screen.getByRole('button', { name: /back to authentication methods/i }));

    // We are back at method selection
    expect(screen.getByText('Choose how to authenticate')).toBeInTheDocument();

    // Return to Manual Setup
    fireEvent.click(screen.getByText('Manual Setup'));

    // The previously entered token should still be there!
    const restoredInput = screen.getByPlaceholderText('Enter your HubSpot access token');
    expect(restoredInput).toHaveValue('pat-preserved-value-123');
  });

  it('triggers onOAuth callback when clicking Login with HubSpot', async () => {
    const onOAuthMock = vi.fn();

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        onOAuth={onOAuthMock}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    const oauthBtn = screen.getByRole('button', { name: /login with hubspot/i });
    fireEvent.click(oauthBtn);

    expect(onOAuthMock).toHaveBeenCalledTimes(1);
  });

  it('shows warning and disables Manual Setup when syncMode is two_way for HubSpot', async () => {
    const onOAuthMock = vi.fn();

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{ platformId: 'hubspot', connectionType: 'destination', environment: 'sandbox' }}
        syncMode="two_way"
        onOAuth={onOAuthMock}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Warning alert is present
    expect(
      screen.getByText(/this project is set to two way sync/i),
    ).toBeInTheDocument();

    // Manual setup button is disabled
    const manualBtn = screen.getByRole('button', { name: /manual setup/i });
    expect(manualBtn).toBeDisabled();
  });

  it('directly opens form view for existing connection edit, bypassing method selection', async () => {
    const onOAuthMock = vi.fn();

    render(
      <CredentialsModal
        projectId="proj-1"
        conn={{
          id: 'conn-existing-1',
          platformId: 'hubspot',
          connectionType: 'destination',
          environment: 'sandbox',
        }}
        onOAuth={onOAuthMock}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    // Starts directly in edit form
    expect(screen.getByText('Edit HubSpot Connection')).toBeInTheDocument();
    expect(screen.getByText('Update your API credentials')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Leave blank to keep existing token'),
    ).toBeInTheDocument();
    // Back button should NOT be present on edit mode
    expect(
      screen.queryByRole('button', { name: /back to authentication methods/i }),
    ).not.toBeInTheDocument();
  });
});
