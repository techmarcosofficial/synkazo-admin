import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateSuperAdminDialog } from './SuperAdminsPage';

function renderDialog(
  overrides: Partial<Parameters<typeof CreateSuperAdminDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <CreateSuperAdminDialog
      open
      onOpenChange={onOpenChange}
      isSubmitting={false}
      errorMessage={null}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { ...result, onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
});

const VALID_PASSWORD = 'supersecurepassword123';
const VALID_REASON = 'provisioning new platform administrator';

describe('CreateSuperAdminDialog', () => {
  it('keeps submit button enabled by default and shows validation errors on empty submit', async () => {
    const { onSubmit } = renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create super admin/i });

    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(
        screen.getByText('Password must be at least 12 characters'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears validation error when the operator types into an invalid field', async () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create super admin/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/^Email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@synkazo.internal' } });

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  it('validates password length and clears error once 12 characters are entered', async () => {
    renderDialog();
    const pwInput = screen.getByLabelText(/Initial password/i);
    const submitBtn = screen.getByRole('button', { name: /create super admin/i });

    fireEvent.change(pwInput, { target: { value: 'short123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 12 characters'),
      ).toBeInTheDocument();
    });

    fireEvent.change(pwInput, { target: { value: VALID_PASSWORD } });

    await waitFor(() => {
      expect(
        screen.queryByText('Password must be at least 12 characters'),
      ).not.toBeInTheDocument();
    });
  });

  it('clears server error on email when user modifies the input', async () => {
    const { rerender } = renderDialog();

    rerender(
      <CreateSuperAdminDialog
        open
        onOpenChange={vi.fn()}
        isSubmitting={false}
        errorMessage="A user with this email already exists"
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('A user with this email already exists'),
      ).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/^Email/i);
    fireEvent.change(emailInput, { target: { value: 'other@synkazo.internal' } });

    await waitFor(() => {
      expect(
        screen.queryByText('A user with this email already exists'),
      ).not.toBeInTheDocument();
    });
  });

  it('submits form with trimmed values and lowercase email when valid', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: '  SuperAdmin@Synkazo.Internal  ' },
    });
    fireEvent.change(screen.getByLabelText(/Full name/i), {
      target: { value: '  Jane Doe  ' },
    });
    fireEvent.change(screen.getByLabelText(/Initial password/i), {
      target: { value: VALID_PASSWORD },
    });
    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: `  ${VALID_REASON}  ` },
    });

    fireEvent.click(screen.getByRole('button', { name: /create super admin/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'superadmin@synkazo.internal',
        fullName: 'Jane Doe',
        initialPassword: VALID_PASSWORD,
        reason: VALID_REASON,
      });
    });
  });

  it('disables submit button and shows Creating... when isSubmitting is true', () => {
    renderDialog({ isSubmitting: true });
    const submitBtn = screen.getByRole('button', { name: /creating…/i });
    expect(submitBtn).toBeDisabled();
  });
});
