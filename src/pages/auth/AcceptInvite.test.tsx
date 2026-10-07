import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import AcceptInvite from './AcceptInvite';

function renderInvite(search: string) {
  window.history.replaceState({}, '', `/accept-invite${search}`);
  return render(
    <MemoryRouter>
      <AcceptInvite />
    </MemoryRouter>,
  );
}

describe('AcceptInvite auth layout', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('uses the registration layout and shows validation beside each field', () => {
    const { container } = renderInvite('?token=invite-token');

    expect(container.querySelector('.synkazo-login-page')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Home' })).toBeNull();
    expect(
      container.querySelector(
        '.synkazo-login-form-content .synkazo-login-brand',
      ),
    ).toBeNull();
    expect(
      container.querySelector('.synkazo-login-fields'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('keeps the same layout for a missing invitation token', () => {
    const { container } = renderInvite('');

    expect(container.querySelector('.synkazo-login-page')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Home' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Invitation Failed' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to Login' }),
    ).toBeInTheDocument();
  });
});
