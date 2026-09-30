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

const VALID_REASON = 'operator provisioned';

describe('InviteMemberDialog', () => {
  it('disables submit until a valid email AND a 10-char reason are entered', () => {
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
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'too short' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: VALID_REASON },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ops@example.com',
      role: 'editor',
      message: undefined,
      reason: VALID_REASON,
    });
  });

  it('lowercases and trims the email before submitting', () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  Ops@Example.COM  ' },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: VALID_REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ops@example.com', reason: VALID_REASON }),
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
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: VALID_REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Welcome to Synkazo',
        reason: VALID_REASON,
      }),
    );
  });
});
