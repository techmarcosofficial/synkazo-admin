import { describe, expect, it } from 'vitest';

import type { ProjectExtended } from './types';
import { filterProjects } from './utils';

type SearchableProject = ProjectExtended & { organisationName?: string };

function project(
  overrides: Partial<SearchableProject> &
    Pick<SearchableProject, 'id' | 'name'>,
): SearchableProject {
  return {
    organisationId: 'org-1',
    sourcePlatformId: 'servicetitan',
    destPlatformId: 'hubspot',
    status: 'active',
    ...overrides,
  };
}

describe('filterProjects', () => {
  const projects = [
    project({
      id: 'project-1',
      name: 'Customer sync',
      description: 'Keeps contacts aligned',
      organisationName: 'Acme Services',
    }),
    project({
      id: 'project-2',
      name: 'Invoice sync',
      status: 'paused',
      organisationName: 'Northwind',
    }),
  ];

  it('searches project names, descriptions, and permitted organisation names', () => {
    expect(
      filterProjects(projects, { search: 'contacts', status: 'all' }).map(
        ({ id }) => id,
      ),
    ).toEqual(['project-1']);

    expect(
      filterProjects(projects, { search: 'northwind', status: 'all' }).map(
        ({ id }) => id,
      ),
    ).toEqual(['project-2']);
  });

  it('combines status and search filters', () => {
    expect(
      filterProjects(projects, { search: 'sync', status: 'paused' }).map(
        ({ id }) => id,
      ),
    ).toEqual(['project-2']);
  });
});
