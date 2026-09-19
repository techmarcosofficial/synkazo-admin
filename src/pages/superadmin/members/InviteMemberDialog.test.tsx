import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InviteMemberDialog from './InviteMemberDialog';

function renderDialog(overrides: Partial<Parameters<typeof InviteMemberDialog>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <InviteMemberDialog
      open
      onOpenChange={vi.fn()}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

afterEach(() => {
  cleanup();
});

describe('InviteMemberDialog', () => {
  it('disables submit until a valid email is entered', () => {
    const { onSubmit } = renderDialog();
    const submit = screen.getByRole('button', { name: /send invite/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ops@example.com' },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ops@example.com',
      role: 'editor',
      message: undefined,
    });
  });

  it('lowercases and trims the email before submitting', () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  Ops@Example.COM  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ops@example.com' }),
    );
  });

  it('passes through an optional message when provided', () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ops@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Welcome to Synkazo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Welcome to Synkazo' }),
    );
  });
});
