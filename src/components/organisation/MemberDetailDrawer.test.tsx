import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MemberDetailDrawer, {
  type MemberDetailTarget,
} from './MemberDetailDrawer';

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: {
      id: 'current-admin-id',
      email: 'admin@acme.com',
      role: 'super_admin',
    },
  }),
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
    isPending: false,
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
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders member identity, email, verified badge, and organization details', () => {
    renderDrawer();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(
      screen.getAllByText('john.doe@example.com').length,
    ).toBeGreaterThan(0);
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
    const newPasswordInput =
      screen.getByPlaceholderText(/At least 8 characters/i);
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
