import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import SuperAdminLayout from './SuperAdminLayout';

// GAP-040 / SA-109 — route-level tests for the Super Admin workspace
// layout. Covers the layout switch (SA sidebar, not tenant sidebar),
// the return link, the amber platform-context banner, the loading and
// redirect-to-login branches, and rendering of nested outlet content
// through direct refresh + unknown-route fallback.

const authMocks = vi.hoisted(() => ({
  currentUser: null as null | { id: string; role: string; email: string },
  isLoading: false,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: authMocks.currentUser,
    isLoading: authMocks.isLoading,
    // nav-main filters items by minRole through `hasRole`. In the test
    // we mount the layout for a super_admin who satisfies every SA_NAV
    // gate, so `hasRole` always returns true.
    hasRole: () => Boolean(authMocks.currentUser),
  }),
}));

vi.mock('@/components/layout/nav-user', () => ({
  NavUser: () => <div data-testid="nav-user" />,
}));

vi.mock('@/components/layout/NotificationsMenu', () => ({
  default: () => <div data-testid="notifications-menu" />,
}));

vi.mock('@/components/branding/SynkazoMark', () => ({
  SynkazoWordmark: () => <span data-testid="synkazo-wordmark">Synkazo</span>,
}));

// The layout uses shadcn's Sidebar primitives which depend on a
// media-query hook that ships without a jsdom shim. Provide a
// deterministic replacement so the components mount cleanly.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

function renderAt(path: string) {
  return render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route path="overview" element={<div>overview-outlet</div>} />
            <Route path="organisations" element={<div>orgs-outlet</div>} />
          </Route>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/dashboard" element={<div>tenant-dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  authMocks.currentUser = { id: 'u1', role: 'super_admin', email: 'sa@sk' };
  authMocks.isLoading = false;
});

afterEach(() => {
  cleanup();
});

describe('SuperAdminLayout', () => {
  it('renders the outlet through a nested route path', () => {
    renderAt('/super-admin/overview');
    expect(screen.getByText('overview-outlet')).toBeInTheDocument();
  });

  it('surfaces the amber platform-context banner on every SA page (SA-107)', () => {
    renderAt('/super-admin/overview');
    expect(
      screen.getByText(
        /You are operating as a Synkazo platform admin/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the "Return to workspace" link that points back at /dashboard', () => {
    renderAt('/super-admin/overview');
    const link = screen.getByRole('link', { name: /return to workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('renders the SA sidebar navigation groups, not tenant links', () => {
    renderAt('/super-admin/overview');
    // Anchor on links that are unique to SA_NAV so we're not asserting
    // against tenant-navigation items that shouldn't be here.
    const orgsLinks = screen.getAllByRole('link', {
      name: /organisations/i,
    });
    expect(orgsLinks.length).toBeGreaterThan(0);
    const overviewLinks = screen.getAllByRole('link', { name: /overview/i });
    expect(overviewLinks.length).toBeGreaterThan(0);
  });

  it('redirects to /login when the auth session has no currentUser', () => {
    authMocks.currentUser = null;
    renderAt('/super-admin/overview');
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('overview-outlet')).not.toBeInTheDocument();
  });

  it('renders a loading state while auth is still resolving', () => {
    authMocks.isLoading = true;
    renderAt('/super-admin/overview');
    // The layout returns <GlobalLoader /> in the isLoading branch —
    // outlet content and the banner must not render yet.
    expect(screen.queryByText('overview-outlet')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/you are operating as a synkazo platform admin/i),
    ).not.toBeInTheDocument();
  });

  it('mounts cleanly for a different nested route (direct-refresh proxy)', () => {
    // We can't literally trigger a browser refresh in jsdom, but the
    // MemoryRouter initialEntries approach models the effect of an
    // operator refreshing the page at a deep URL — the layout mounts,
    // the auth loads, and the outlet renders.
    renderAt('/super-admin/organisations');
    expect(screen.getByText('orgs-outlet')).toBeInTheDocument();
  });

  it('does not render the layout for an unmatched deep link', () => {
    // React Router v6 requires parent + child to both match; a path
    // like /super-admin/unknown-slug that has no matching nested route
    // never enters the layout. The real app tree relies on a
    // top-level 404 route (or a redirect) to catch these, not the
    // layout itself. Verifies SA-108's boundary: the layout is only
    // painted for known child paths.
    renderAt('/super-admin/unknown-slug');
    expect(screen.queryByText('overview-outlet')).not.toBeInTheDocument();
    expect(screen.queryByText('orgs-outlet')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/you are operating as a synkazo platform admin/i),
    ).not.toBeInTheDocument();
  });
});
