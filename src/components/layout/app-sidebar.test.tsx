import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppSidebar } from './app-sidebar';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  org: undefined as { id: string; name: string } | undefined,
  queryOptions: undefined as { enabled?: boolean } | undefined,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => true }),
}));

vi.mock('@/queries/useOrganisations', () => ({
  useMyOrgQuery: (options?: { enabled?: boolean }) => {
    mocks.queryOptions = options;
    return { data: mocks.org };
  },
}));

afterEach(() => cleanup());

function renderSidebar(kind: 'tenant' | 'platform' = 'tenant') {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar kind={kind} />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('AppSidebar organization item', () => {
  beforeEach(() => {
    mocks.org = undefined;
    mocks.queryOptions = undefined;
  });

  it("shows the organization's name instead of a generic label", () => {
    mocks.org = { id: 'org-1', name: 'Acme HVAC' };
    renderSidebar();

    const link = screen.getByRole('link', { name: 'Acme HVAC' });
    expect(link).toHaveAttribute('href', '/organization');
    expect(screen.queryByText('This organization')).not.toBeInTheDocument();
  });

  it('falls back to "Organization" while the name loads', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Organization' })).toHaveAttribute(
      'href',
      '/organization',
    );
  });

  it('does not fetch the organization on the platform sidebar', () => {
    renderSidebar('platform');

    expect(mocks.queryOptions).toEqual({ enabled: false });
  });
});
