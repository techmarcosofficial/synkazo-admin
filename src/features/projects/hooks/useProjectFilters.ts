import { useMemo, useState } from 'react';

import { DEFAULT_PROJECT_FILTERS } from '../types';
import type { ProjectExtended, ProjectFiltersState } from '../types';
import { filterProjects } from '../utils';

export function useProjectFilters(projects: ProjectExtended[]) {
  const [filters, setFilters] = useState<ProjectFiltersState>(
    DEFAULT_PROJECT_FILTERS,
  );

  const filteredProjects = useMemo(
    () => filterProjects(projects, filters),
    [projects, filters],
  );

  return { filters, setFilters, filteredProjects };
}
