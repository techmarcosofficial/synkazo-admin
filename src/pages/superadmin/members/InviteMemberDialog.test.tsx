import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InviteMemberDialog from './InviteMemberDialog';

function renderDialog(
  overrides: Partial<Parameters<typeof InviteMemberDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <InviteMemberDialog
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

const VALID_REASON = 'operator provisioned';

describe('InviteMemberDialog', () => {
  it('keeps submit button enabled by default and shows validation errors on click', async () => {
    const { onSubmit } = renderDialog();
    const submit = screen.getByRole('button', { name: /send invite/i });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes validation error on input change when user starts typing', async () => {
    renderDialog();
    const submit = screen.getByRole('button', { name: /send invite/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'ops@example.com' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  it('displays invalid email error and clears it when corrected', async () => {
    renderDialog();
    const emailInput = screen.getByLabelText(/^email/i);
    const submit = screen.getByRole('button', { name: /send invite/i });

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address'),
      ).toBeInTheDocument();
    });

    fireEvent.change(emailInput, { target: { value: 'ops@example.com' } });

    await waitFor(() => {
      expect(
        screen.queryByText('Please enter a valid email address'),
      ).not.toBeInTheDocument();
    });
  });

  it('clears server error on email when user modifies the input', async () => {
    const { rerender } = renderDialog();

    rerender(
      <InviteMemberDialog
        open
        onOpenChange={vi.fn()}
        isSubmitting={false}
        errorMessage="Member with this email is already invited"
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Member with this email is already invited'),
      ).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/^email/i);
    fireEvent.change(emailInput, { target: { value: 'new-email@example.com' } });

    await waitFor(() => {
      expect(
        screen.queryByText('Member with this email is already invited'),
      ).not.toBeInTheDocument();
    });
  });

  it('lowercases and trims the email before submitting', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: '  Ops@Example.COM  ' },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: VALID_REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ops@example.com',
          reason: VALID_REASON,
        }),
      );
    });
  });

  it('passes through an optional message when provided', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'ops@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Welcome to Synkazo' },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: VALID_REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ops@example.com',
          message: 'Welcome to Synkazo',
          reason: VALID_REASON,
        }),
      );
    });
  });

  it('disables submit button and shows Sending... when isSubmitting is true', () => {
    renderDialog({ isSubmitting: true });
    const submit = screen.getByRole('button', { name: /sending…/i });
    expect(submit).toBeDisabled();
  });
});
