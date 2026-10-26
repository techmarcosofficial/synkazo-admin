import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MemberDetailDrawer, {
  type MemberDetailTarget,
} from './MemberDetailDrawer';

const authState = vi.hoisted(() => ({
  currentUser: {
    id: 'current-admin-id',
    email: 'admin@acme.com',
    role: 'super_admin',
    organisationId: 'org-456',
  },
  refreshUser: vi.fn(),
  updatePending: false,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => authState,
}));

const emptyProjects: any[] = [];
const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockResetPasswordMutateAsync = vi.fn().mockResolvedValue({
  success: true,
  message: 'Success',
});

vi.mock('@/queries/useUsers', () => ({
  useUpdateUserMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: authState.updatePending,
  }),
  useUserProjectAccessQuery: () => ({
    data: emptyProjects,
    isLoading: false,
  }),
  useResetPasswordByAdminMutation: () => ({
    mutateAsync: mockResetPasswordMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/queries/useProjects', () => ({
  useProjectsQuery: () => ({
    data: [
      { id: 'proj-1', name: 'Project Alpha' },
      { id: 'proj-2', name: 'Project Beta' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminProjectsQuery: () => ({
    data: {
      items: [
        { id: 'proj-1', name: 'Project Alpha' },
        { id: 'proj-2', name: 'Project Beta' },
      ],
      total: 2,
    },
    isLoading: false,
  }),
}));

const mockMember: MemberDetailTarget = {
  id: 'user-123',
  email: 'john.doe@example.com',
  fullName: 'John Doe',
  role: 'editor',
  isActive: true,
  organisationId: 'org-456',
  organisationName: 'Acme Corp',
  department: 'Engineering',
  isEmailVerified: true,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  permissions: ['job.view', 'job.run'],
};

function renderDrawer(
  props: Partial<Parameters<typeof MemberDetailDrawer>[0]> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MemberDetailDrawer
          open={true}
          onOpenChange={vi.fn()}
          member={mockMember}
          isSuperAdmin={true}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MemberDetailDrawer', () => {
  beforeEach(() => {
    authState.currentUser.id = 'current-admin-id';
    authState.currentUser.role = 'super_admin';
    authState.currentUser.organisationId = 'org-456';
    authState.updatePending = false;
    authState.refreshUser.mockReset().mockResolvedValue({});
    mockMutateAsync.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders member identity, email, verified badge, and organization details', () => {
    renderDrawer();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('john.doe@example.com').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays the Profile & Details tab with editable fields', () => {
    renderDrawer();

    const nameInput = screen.getByDisplayValue('John Doe');
    expect(nameInput).toBeInTheDocument();

    const deptInput = screen.getByDisplayValue('Engineering');
    expect(deptInput).toBeInTheDocument();
  });

  it('lets the organisation admin save a normalized member email', async () => {
    authState.currentUser.role = 'org_admin';
    const onOpenChange = vi.fn();
    renderDrawer({ isSuperAdmin: false, onOpenChange });
    const email = screen.getByRole('textbox', { name: 'Email address' });
    expect(email).toHaveValue(mockMember.email);
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Change email' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    expect(email).not.toHaveAttribute('readonly');
    fireEvent.change(email, { target: { value: '  New.Email@Example.COM  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockMutateAsync).toHaveBeenCalledExactlyOnceWith({
      id: mockMember.id,
      data: expect.objectContaining({ email: 'new.email@example.com' }),
    });
  });

  it.each(['', 'invalid-email', 'user@', `${'a'.repeat(250)}@example.com`])(
    'rejects invalid email %s before sending an update',
    async (email) => {
      authState.currentUser.role = 'org_admin';
      renderDrawer({ isSuperAdmin: false });
      fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
        target: { value: email },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Enter a valid email address.',
      );
      expect(mockMutateAsync).not.toHaveBeenCalled();
    },
  );

  it('keeps a duplicate email editable after failure and allows retry', async () => {
    authState.currentUser.role = 'org_admin';
    mockMutateAsync.mockRejectedValueOnce({
      response: { data: { message: 'Email already in use' } },
    });
    const onOpenChange = vi.fn();
    renderDrawer({ isSuperAdmin: false, onOpenChange });
    const email = screen.getByRole('textbox', { name: 'Email address' });
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    fireEvent.change(email, { target: { value: 'taken@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email already in use',
    );
    expect(email).toHaveValue('taken@example.com');
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.change(email, { target: { value: 'available@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockMutateAsync).toHaveBeenLastCalledWith({
      id: mockMember.id,
      data: expect.objectContaining({ email: 'available@example.com' }),
    });
  });

  it.each([
    ['editor', 'org-456'],
    ['org_admin', 'another-org'],
  ])('keeps email read-only for %s in %s', (role, organisationId) => {
    authState.currentUser.role = role;
    authState.currentUser.organisationId = organisationId;
    renderDrawer({ isSuperAdmin: false });
    expect(
      screen.getByRole('textbox', { name: 'Email address' }),
    ).toHaveAttribute('readonly');
  });

  it('keeps the signed-in user email locked in the member drawer', () => {
    authState.currentUser.role = 'org_admin';
    authState.currentUser.id = mockMember.id;
    renderDrawer({
      isSuperAdmin: false,
      member: { ...mockMember, role: 'org_admin' },
    });
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute(
      'readonly',
    );
    expect(screen.queryByRole('button', { name: 'Change email' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Change your own email from Profile, where it is verified.'),
    ).toBeInTheDocument();
  });

  it('restores the original email when an administrator cancels email editing', () => {
    authState.currentUser.role = 'org_admin';
    renderDrawer({ isSuperAdmin: false });
    const email = screen.getByRole('textbox', { name: 'Email address' });
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    fireEvent.change(email, { target: { value: 'changed@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel email edit' }));
    expect(email).toHaveValue(mockMember.email);
    expect(email).toHaveAttribute('readonly');
  });

  it('disables email editing while saving', () => {
    authState.updatePending = true;
    renderDrawer();
    expect(
      screen.getByRole('textbox', { name: 'Email address' }),
    ).toBeDisabled();
  });

  it('omits email when only other details are saved', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledOnce());
    expect(mockMutateAsync.mock.calls[0][0].data).not.toHaveProperty('email');
  });

  it('switches to Role & Permissions tab and renders flat capability checkboxes', async () => {
    renderDrawer();

    const permissionsTabTrigger = screen.getByRole('tab', {
      name: /Role & Permissions/i,
    });
    await userEvent.click(permissionsTabTrigger);

    expect(screen.getByText('Role Assignment')).toBeInTheDocument();
    expect(screen.getByText('Org Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Editor').length).toBeGreaterThan(0);

    // Flat granular capability group is rendered without accordions
    expect(screen.getByText('Granular Capabilities')).toBeInTheDocument();
    expect(screen.getByText('View Projects')).toBeInTheDocument();
    expect(screen.getByText('Create Projects')).toBeInTheDocument();
    expect(screen.getByText('Run Jobs')).toBeInTheDocument();
  });

  it('handles inline deactivation with optional reason input', async () => {
    renderDrawer();

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate/i });
    expect(deactivateBtn).toBeInTheDocument();

    await userEvent.click(deactivateBtn);

    // Shows inline confirmation banner with reason field
    expect(screen.getByText(/Deactivate John Doe\?/i)).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/Employee offboarding/i);
    expect(reasonInput).toBeInTheDocument();

    await userEvent.type(reasonInput, 'Contract ended');

    expect(
      screen.getByRole('button', { name: /Confirm Deactivate/i }),
    ).toBeInTheDocument();

    // Confirm inline deactivation
    await userEvent.click(
      screen.getByRole('button', { name: /Confirm Deactivate/i }),
    );

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 'user-123',
      data: { isActive: false },
    });
  });

  it('supports sending password reset email', async () => {
    renderDrawer();

    const sendResetBtn = screen.getByRole('button', {
      name: /Send Reset Link/i,
    });
    expect(sendResetBtn).toBeInTheDocument();

    await userEvent.click(sendResetBtn);

    expect(mockResetPasswordMutateAsync).toHaveBeenCalledWith({
      id: 'user-123',
    });
  });

  it('supports setting password manually with validation', async () => {
    renderDrawer();

    const setManualBtn = screen.getByRole('button', {
      name: /Set password manually/i,
    });
    expect(setManualBtn).toBeInTheDocument();

    await userEvent.click(setManualBtn);

    // Shows manual password inputs
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    const newPasswordInput = screen.getByPlaceholderText(
      /At least 8 characters/i,
    );
    const confirmPasswordInput =
      screen.getByPlaceholderText(/Re-enter password/i);
    const updatePasswordBtn = screen.getByRole('button', {
      name: /Update Password/i,
    });

    await userEvent.type(newPasswordInput, 'SecureNewPass123!');
    await userEvent.type(confirmPasswordInput, 'SecureNewPass123!');

    await userEvent.click(updatePasswordBtn);

    expect(mockResetPasswordMutateAsync).toHaveBeenCalledWith({
      id: 'user-123',
      newPassword: 'SecureNewPass123!',
    });
  });
});
