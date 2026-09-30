import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectsPage from './ProjectsPage';

import type { ProjectExtended } from '@/features/projects/types';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';

vi.mock('@/queries/useProjects', () => ({
  useProjectsQuery: vi.fn(),
}));

vi.mock('@/queries/useJobs', () => ({
  useJobsQuery: vi.fn(),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasPermission: () => true,
    hasRole: () => true,
  }),
}));

vi.mock('@/hooks/useViewMode', () => ({
  useViewMode: () => ['table', vi.fn()],
}));

vi.mock('@/features/projects/components/create/CreateProjectButton', () => ({
  default: () => <button data-testid="create-project-btn">Create</button>,
}));

vi.mock('@/components/shared/AccountContextAlert', () => ({
  default: () => null,
}));

describe('ProjectsPage - Environment Awareness in Table View', () => {
  const mockProjects: ProjectExtended[] = [
    {
      id: 'proj-sandbox',
      name: 'HubSpot Staging Sync',
      organisationId: 'org-1',
      status: 'active',
      sourcePlatformId: 'hubspot',
      destPlatformId: 'salesforce',
      activeEnvironment: 'sandbox',
      totalRecordsSynced: 50,
      lastSyncedAt: '2026-03-01T12:00:00Z',
    },
    {
      id: 'proj-prod',
      name: 'HubSpot Live Sync',
      organisationId: 'org-1',
      status: 'active',
      sourcePlatformId: 'hubspot',
      destPlatformId: 'salesforce',
      activeEnvironment: 'production',
      totalRecordsSynced: 12500,
      lastSyncedAt: '2026-03-01T14:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjectsQuery).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useJobsQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);
  });

  afterEach(cleanup);

  it('renders Environment table column header and links each project to its environment settings', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify column header
    expect(screen.getByRole('columnheader', { name: 'Environment' })).toBeInTheDocument();

    // Verify Sandbox badge and link
    const sandboxBadge = screen.getByText('Sandbox (Test Mode)');
    expect(sandboxBadge).toBeInTheDocument();
    const sandboxLink = sandboxBadge.closest('a');
    expect(sandboxLink).toHaveAttribute(
      'href',
      '/projects/proj-sandbox?tab=settings&section=environments',
    );

    // Verify Production badge and link
    const prodBadge = screen.getByText('Production (Live)');
    expect(prodBadge).toBeInTheDocument();
    const prodLink = prodBadge.closest('a');
    expect(prodLink).toHaveAttribute(
      'href',
      '/projects/proj-prod?tab=settings&section=environments',
    );
  });
});
