import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlatformSettingsLayout from './PlatformSettingsLayout';

const authMocks = vi.hoisted(() => ({
  currentUser: {
    id: 'sa-1',
    role: 'super_admin',
    email: 'admin@synkazo.io',
    fullName: 'Platform Superadmin',
    status: 'active',
  },
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: authMocks.currentUser,
    hasRole: (role: string) => role === 'super_admin' || role === 'editor',
  }),
}));

vi.mock('@/queries/useOrganisations', () => ({
  useMyOrgQuery: () => ({ data: undefined }),
}));

function renderLayoutAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/super-admin/settings" element={<PlatformSettingsLayout />}>
          <Route path="profile" element={<div>profile-tab-content</div>} />
          <Route path="preferences" element={<div>preferences-tab-content</div>} />
        </Route>
        <Route path="/super-admin/overview" element={<div>overview-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('PlatformSettingsLayout', () => {
  it('renders Settings header and navigation tabs for superadmin', () => {
    renderLayoutAt('/super-admin/settings/profile');

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Platform Superadmin')).toBeInTheDocument();
    expect(screen.getByText('admin@synkazo.io')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Profile & Account' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByText('profile-tab-content')).toBeInTheDocument();
  });

  it('renders preferences tab when visiting /super-admin/settings/preferences', () => {
    renderLayoutAt('/super-admin/settings/preferences');

    expect(screen.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(screen.getByText('preferences-tab-content')).toBeInTheDocument();
  });

  it('links back to Super Admin overview', () => {
    renderLayoutAt('/super-admin/settings/profile');

    const backLink = screen.getByRole('link', { name: /Back to Overview/i });
    expect(backLink).toHaveAttribute('href', '/super-admin/overview');
  });
});
