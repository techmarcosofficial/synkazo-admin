import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PreferencesTab from './PreferencesTab';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  updateMe: vi.fn().mockResolvedValue(undefined),
  currentUser: {
    notifySyncCompleted: false,
    notifySyncFailed: true,
  },
}));

vi.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mocks.setTheme }),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: mocks.currentUser,
  }),
}));

vi.mock('@/queries/useUsers', () => ({
  useUpdateMeMutation: () => ({
    mutateAsync: mocks.updateMe,
    isPending: false,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PreferencesTab', () => {
  it('groups notifications separately from accessible display choices', async () => {
    render(<PreferencesTab />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Appearance & Display')).toBeInTheDocument();
    expect(screen.queryByText(/^Preferences$/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Dark/i }));
    expect(mocks.setTheme).toHaveBeenCalledWith('dark');

    fireEvent.click(screen.getByRole('switch', { name: 'Sync completed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Notifications' }));

    await waitFor(() =>
      expect(mocks.updateMe).toHaveBeenCalledWith({
        notifySyncCompleted: true,
        notifySyncFailed: true,
      }),
    );
  });
});
