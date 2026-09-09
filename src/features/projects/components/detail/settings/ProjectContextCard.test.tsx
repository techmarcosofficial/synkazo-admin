import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import ProjectContextCard from './ProjectContextCard';

import type { ProjectExt } from '@/features/projects/hooks';
import { useOrgQuery } from '@/queries/useOrganisations';

vi.mock('@/queries/useOrganisations', () => ({
  useOrgQuery: vi.fn(),
}));

const project: ProjectExt = {
  id: 'project-1',
  name: 'Acme integration',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  status: 'active',
};

const useOrgQueryMock = vi.mocked(useOrgQuery);

afterEach(cleanup);

beforeEach(() => {
  useOrgQueryMock.mockReset();
});

describe('ProjectContextCard', () => {
  it('shows immutable project context and links to environment settings', () => {
    useOrgQueryMock.mockReturnValue({
      data: { id: 'org-1', name: 'Acme Roofing' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrgQuery>);

    render(
      <MemoryRouter>
        <ProjectContextCard
          project={project}
          activeEnvironment="production"
          environmentsHref="/projects/project-1?tab=settings&section=environments"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Acme Roofing')).toBeInTheDocument();
    expect(screen.getByText('ServiceTitan')).toBeInTheDocument();
    expect(screen.getByText('HubSpot')).toBeInTheDocument();
    expect(screen.getByText('One-way')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view environments/i }),
    ).toHaveAttribute(
      'href',
      '/projects/project-1?tab=settings&section=environments',
    );
    expect(screen.getByText('Integration platforms')).toBeInTheDocument();
  });

  it('keeps the organization ID visible when the name cannot be loaded', () => {
    useOrgQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useOrgQuery>);

    render(
      <MemoryRouter>
        <ProjectContextCard
          project={{ ...project, syncMode: null }}
          activeEnvironment={null}
          environmentsHref="/projects/project-1?tab=settings&section=environments"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Organization name unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByText('ID: org-1')).toBeInTheDocument();
    expect(screen.getByText('Unrestricted')).toBeInTheDocument();
    expect(screen.getByText('Not activated')).toBeInTheDocument();
  });
});
