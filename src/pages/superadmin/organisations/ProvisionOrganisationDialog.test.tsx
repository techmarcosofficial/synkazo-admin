import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProvisionOrganisationDialog from './ProvisionOrganisationDialog';

function renderDialog(
  overrides: Partial<Parameters<typeof ProvisionOrganisationDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <ProvisionOrganisationDialog
      open
      onOpenChange={onOpenChange}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { ...result, onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
});

const VALID_REASON = 'provisioning new enterprise customer';

describe('ProvisionOrganisationDialog', () => {
  it('keeps the Provision button enabled by default and shows required validation errors on click', async () => {
    const { onSubmit } = renderDialog();

    const submitButton = screen.getByRole('button', { name: /provision$/i });

    // Button should ALWAYS be enabled (not disabled)
    expect(submitButton).toBeEnabled();

    // Click submit with empty form
    fireEvent.click(submitButton);

    // Form validation errors should now appear
    await waitFor(() => {
      expect(
        screen.getByText('Organisation name is required'),
      ).toBeInTheDocument();
      expect(screen.getByText('Owner email is required')).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes validation error on input change when user starts typing', async () => {
    renderDialog();

    const submitButton = screen.getByRole('button', { name: /provision$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Owner email is required')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Owner email/i);

    // Type a valid email
    fireEvent.change(emailInput, { target: { value: 'owner@example.com' } });

    // The error should disappear on change
    await waitFor(() => {
      expect(
        screen.queryByText('Owner email is required'),
      ).not.toBeInTheDocument();
    });
  });

  it('displays invalid email error and clears it when fixed', async () => {
    renderDialog();

    const emailInput = screen.getByLabelText(/Owner email/i);
    const submitButton = screen.getByRole('button', { name: /provision$/i });

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address'),
      ).toBeInTheDocument();
    });

    // Fix the email
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });

    await waitFor(() => {
      expect(
        screen.queryByText('Please enter a valid email address'),
      ).not.toBeInTheDocument();
    });
  });

  it('submits form with trimmed values and lowercased email when valid', async () => {
    const { onSubmit } = renderDialog();

    const nameInput = screen.getByLabelText(/Organisation name/i);
    const emailInput = screen.getByLabelText(/Owner email/i);
    const reasonInput = screen.getByLabelText(/Reason/i);
    const submitButton = screen.getByRole('button', { name: /provision$/i });

    fireEvent.change(nameInput, { target: { value: 'Acme Corp' } });
    fireEvent.change(emailInput, { target: { value: '  Owner@Acme.Example  ' } });
    fireEvent.change(reasonInput, { target: { value: VALID_REASON } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Corp',
        slug: 'acme-corp',
        description: undefined,
        ownerEmail: 'owner@acme.example',
        invitationMessage: undefined,
        reason: VALID_REASON,
      });
    });
  });

  it('displays owner email assignment server error below the input and clears it as soon as input is changed', async () => {
    const { rerender } = renderDialog({
      errorMessage: null,
    });

    const nameInput = screen.getByLabelText(/Organisation name/i);
    const emailInput = screen.getByLabelText(/Owner email/i);

    fireEvent.change(nameInput, { target: { value: 'Test Org' } });
    fireEvent.change(emailInput, { target: { value: 'assigned@example.com' } });

    // Server returns error
    rerender(
      <ProvisionOrganisationDialog
        open
        onOpenChange={vi.fn()}
        isSubmitting={false}
        errorMessage="User is already assigned to another organisation"
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('User is already assigned to another organisation'),
      ).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    // User changes the email input
    fireEvent.change(emailInput, { target: { value: 'different@example.com' } });

    // Server error should immediately disappear on input change!
    await waitFor(() => {
      expect(
        screen.queryByText('User is already assigned to another organisation'),
      ).not.toBeInTheDocument();
    });
  });

  it('displays general non-email errors in the bottom alert banner', () => {
    renderDialog({
      errorMessage: 'Database connection failed. Try again.',
    });

    expect(
      screen.getByText('Database connection failed. Try again.'),
    ).toBeInTheDocument();
  });

  it('disables submit button and displays Provisioning... while submitting', () => {
    renderDialog({ isSubmitting: true });

    expect(
      screen.getByRole('button', { name: /provisioning…/i }),
    ).toBeDisabled();
    expect(screen.getByLabelText(/Organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Owner email/i)).toBeDisabled();
  });
});
