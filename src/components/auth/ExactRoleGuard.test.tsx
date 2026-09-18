import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExactRoleGuard from './ExactRoleGuard';

const mocks = vi.hoisted(() => ({
  currentUser: null as null | { role: string },
  isLoading: false,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: mocks.currentUser,
    isLoading: mocks.isLoading,
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ExactRoleGuard role="super_admin" />}>
          <Route path="/super-admin" element={<div>super-admin content</div>} />
        </Route>
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.currentUser = null;
  mocks.isLoading = false;
});

afterEach(() => {
  cleanup();
});

describe('ExactRoleGuard', () => {
  it('renders the protected content when the role matches exactly', () => {
    mocks.currentUser = { role: 'super_admin' };
    renderAt('/super-admin');
    expect(screen.getByText('super-admin content')).toBeInTheDocument();
  });

  it('redirects an org_admin (higher role in inclusive hierarchies is not sufficient)', () => {
    mocks.currentUser = { role: 'org_admin' };
    renderAt('/super-admin');
    expect(screen.queryByText('super-admin content')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('redirects an editor', () => {
    mocks.currentUser = { role: 'editor' };
    renderAt('/super-admin');
    expect(screen.queryByText('super-admin content')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor', () => {
    mocks.currentUser = null;
    renderAt('/super-admin');
    expect(screen.queryByText('super-admin content')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('shows a loading state while auth is still resolving', () => {
    mocks.isLoading = true;
    renderAt('/super-admin');
    expect(screen.queryByText('super-admin content')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });
});
