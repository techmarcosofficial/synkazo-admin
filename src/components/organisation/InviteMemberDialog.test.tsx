import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InviteMemberDialog from './InviteMemberDialog';
import { toast } from 'sonner';

const mockMutateAsync = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: { id: 'u-1', role: 'super_admin' },
  }),
}));

vi.mock('@/queries/useProjects', () => ({
  useProjectsQuery: () => ({
    data: [],
  }),
}));

vi.mock('@/queries/useInvitations', () => ({
  useCreateInvitationMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InviteMemberDialog — plan limit error handling', () => {
  it('displays clear member limit reached message in alert and toast when rejected by API', async () => {
    const planLimitMessage =
      'You have reached your member limit. Please upgrade your plan to invite more users.';

    mockMutateAsync.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          statusCode: 403,
          code: 'PLAN_LIMIT_TEAM',
          message: planLimitMessage,
        },
      },
    });

    render(<InviteMemberDialog open={true} onOpenChange={vi.fn()} />);

    // Fill in email
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'second@company.com' } });

    // Select Org Admin role to send directly in step 1
    const orgAdminRadio = screen.getByLabelText(/org admin/i);
    fireEvent.click(orgAdminRadio);

    // Click Send Invitation
    const sendButton = screen.getByRole('button', { name: /send invitation/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Must display the destructive alert with planLimitMessage
      expect(screen.getByRole('alert')).toHaveTextContent(planLimitMessage);
      // Must call toast.error with the exact message
      expect(toast.error).toHaveBeenCalledWith(planLimitMessage);
    });
  });
});
