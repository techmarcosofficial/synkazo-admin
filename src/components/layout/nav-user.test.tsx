import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NavUser } from './nav-user';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark' | 'system',
  setTheme: vi.fn(),
}));

vi.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: mocks.theme, setTheme: mocks.setTheme }),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: {
      email: 'roth@example.com',
      fullName: 'Roth Ware',
      role: 'org_admin',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/components/ui/sidebar', () => {
  const Container = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    SidebarMenu: Container,
    SidebarMenuItem: Container,
    SidebarMenuButton: Container,
    useSidebar: () => ({ isMobile: false }),
  };
});

vi.mock('@/components/ui/dropdown-menu', () => {
  const Container = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    DropdownMenu: Container,
    DropdownMenuContent: Container,
    DropdownMenuGroup: Container,
    DropdownMenuLabel: Container,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: Container,
    DropdownMenuItem: Container,
  };
});

afterEach(() => {
  cleanup();
  mocks.theme = 'light';
  vi.clearAllMocks();
});

describe('NavUser appearance controls', () => {
  it('links Settings to the settings section and switches to dark mode', () => {
    render(
      <MemoryRouter>
        <NavUser variant="avatar" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );

    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    expect(themeSwitch).not.toBeChecked();

    fireEvent.click(themeSwitch);
    expect(mocks.setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches an active dark theme back to light', () => {
    mocks.theme = 'dark';

    render(
      <MemoryRouter>
        <NavUser variant="avatar" />
      </MemoryRouter>,
    );

    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    expect(themeSwitch).toBeChecked();

    fireEvent.click(themeSwitch);
    expect(mocks.setTheme).toHaveBeenCalledWith('light');
  });
});
