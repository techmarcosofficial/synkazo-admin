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

  it('keeps headings and field labels bare while option cards stay readable', () => {
    render(<PreferencesTab />);

    // Card and field descriptions moved into their info tooltips.
    const collapsed = [
      'Choose which sync updates arrive by email.',
      'Personalize how Synkazo looks and presents your data.',
      'Select the color mode that feels most comfortable.',
      'Used across management pages until a page is switched manually.',
      'Choose how major cards, panels, drawers, and dialogs separate.',
    ];
    for (const text of collapsed) {
      expect(screen.queryByText(text)).toBeNull();
    }
    expect(
      screen.getAllByRole('button', { name: /more information/i }),
    ).toHaveLength(collapsed.length);

    // Choosable options still describe themselves on the page.
    for (const text of [
      'Bright and clean throughout the app',
      'Comfortable in low-light environments',
      'Compact rows for scanning more data',
      'Email when a sync job finishes successfully',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
