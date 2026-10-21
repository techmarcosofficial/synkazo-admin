import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './app-layout';

const state = vi.hoisted(() => ({ status: 'active', hold: false }));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: { id: 'user-1' },
    isLoading: false,
    hasRole: () => false,
    hasPermission: () => true,
  }),
}));
vi.mock('@/queries/useBilling', () => ({
  usePlanQuery: () => ({
    isLoading: false,
    data: { subscriptionStatus: state.status, paymentHoldActive: state.hold },
  }),
}));
vi.mock('@/components/billing/SubscriptionPaywall', () => ({
  default: () => <div>Payment confirmation required</div>,
}));
vi.mock('@/components/layout/app-sidebar', () => ({ AppSidebar: () => null }));
vi.mock('@/components/layout/site-header', () => ({ default: () => null }));
vi.mock('@/components/shared/WelcomeGuideModal', () => ({
  default: () => null,
}));
vi.mock('@/features/projects/components/setup/SourceSetupDialog', () => ({
  default: () => null,
}));
vi.mock('@/features/projects/components/create/CreateProjectDialog', () => ({
  default: () => null,
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
afterEach(cleanup);
function show(status: string, hold: boolean, path = '/dashboard') {
  state.status = status;
  state.hold = hold;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={path} element={<div>Workspace content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
describe('Dashboard billing gate', () => {
  it('removes dashboard access after recurring grace expires', () => {
    show('past_due', true);
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
    expect(
      screen.getByText('Payment confirmation required'),
    ).toBeInTheDocument();
  });
  it('keeps access during a verified renewal grace period', () => {
    show('past_due', false);
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });
  it.each(['incomplete', 'unpaid', 'paused'])(
    'blocks dashboard access for %s',
    (status) => {
      show(status, false);
      expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
    },
  );
  it('leaves billing available for payment recovery', () => {
    show('past_due', true, '/organization/billing/payment-methods');
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });
  it('restores dashboard access after successful recovery', () => {
    show('active', false);
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });
});
