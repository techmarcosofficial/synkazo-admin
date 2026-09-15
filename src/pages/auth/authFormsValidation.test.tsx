import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPassword from './ForgotPassword';
import Login from './Login';
import Register from './Register';

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    ...authMocks,
    currentUser: null,
    isLoading: false,
  }),
}));

vi.mock('@/components/auth/SplitAuthLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/api/auth-pages-settings', () => ({
  authPagesSettingsApi: {
    get: vi.fn().mockResolvedValue({ register: true }),
  },
}));

vi.mock('@/api/apiClient', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
  showToast: { success: vi.fn(), error: vi.fn() },
}));

function renderAuthPage(page: React.ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('auth form inline validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('shows login errors beside the empty fields', async () => {
    const user = userEvent.setup();
    renderAuthPage(<Login />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it('shows and clears password mismatch feedback in real time', async () => {
    const user = userEvent.setup();
    renderAuthPage(<Register />);

    const password = screen.getByLabelText(/^Password/i);
    const confirmation = screen.getByLabelText(/Confirm Password/i);

    await user.type(password, 'Secure1!');
    await user.type(confirmation, 'Different1!');
    await user.tab();

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    await user.clear(confirmation);
    await user.type(confirmation, 'Secure1!');

    expect(password).toHaveValue('Secure1!');
    expect(confirmation).toHaveValue('Secure1!');

    await waitFor(() =>
      expect(
        screen.queryByText('Passwords do not match.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows an inline forgot-password email error after blur', async () => {
    const user = userEvent.setup();
    renderAuthPage(<ForgotPassword />);

    const email = screen.getByLabelText(/Email address/i);
    await user.type(email, 'not-an-email');
    await user.tab();

    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
  });
});
