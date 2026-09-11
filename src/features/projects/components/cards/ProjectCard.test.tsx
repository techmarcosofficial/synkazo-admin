import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import ProjectCard from './ProjectCard';

import type { ProjectExtended } from '@/features/projects/types';

const draftProject: ProjectExtended = {
  id: 'project-1',
  name: 'Customer sync',
  description: 'Keeps customer records aligned.',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'two_way',
  status: 'draft',
  totalRecordsSynced: 1200,
};

afterEach(cleanup);

describe('ProjectCard', () => {
  it('shows project context and actions', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={draftProject} jobCount={3} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/continue setup/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /two-way sync/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('1.2K')).toBeInTheDocument();

    const projectLinks = screen.getAllByRole('link');
    expect(projectLinks).toHaveLength(2);
    projectLinks.forEach((link) =>
      expect(link).toHaveAttribute('href', '/projects/project-1'),
    );

    expect(projectLinks[0].closest('[data-slot="card"]')).toHaveClass(
      'hover:-translate-y-1',
    );
  });

  it('uses a one-way indicator unless the project is explicitly two-way', () => {
    render(
      <MemoryRouter>
        <ProjectCard
          project={{ ...draftProject, syncMode: null }}
          jobCount={0}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('img', { name: /one-way sync/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /two-way sync/i }),
    ).not.toBeInTheDocument();
  });
});
