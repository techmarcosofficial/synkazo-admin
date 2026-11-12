import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import GuideLayer from './GuideLayer';
import { useGuideStore } from './guideStore';
import { useGuideSpot } from './useGuideSpot';

import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useProjectsQuery } from '@/queries/useProjects';

/**
 * Starts the first-run guide for an organisation with no projects, keeps it
 * pointed at the project it's following, and owns the one hint that lives
 * outside any page: the Projects item in the sidebar.
 */
export default function GuideController() {
  const location = useLocation();
  const { currentUser, hasPermission } = useSynkazoAuth();
  const canCreate = hasPermission('project.create');
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data;

  const status = useGuideStore((s) => s.status);
  const projectId = useGuideStore((s) => s.projectId);
  const bindUser = useGuideStore((s) => s.bindUser);
  const start = useGuideStore((s) => s.start);
  const setProject = useGuideStore((s) => s.setProject);

  useEffect(() => {
    if (currentUser?.id) bindUser(currentUser.id);
  }, [currentUser?.id, bindUser]);

  const isFetching = projectsQuery.isFetching;
  useEffect(() => {
    // Wait for fresh data: right after a project is created the cached list is
    // still empty, and acting on it would un-follow the new project.
    if (!projects || isFetching) return;
    // New means no projects at all. Anyone arriving with projects never sees it.
    if (status === 'idle') {
      if (projects.length === 0 && canCreate) start();
      return;
    }
    if (status !== 'active') return;
    const followed = projectId && projects.some((p) => p.id === projectId);
    if (followed) return;
    // Created somewhere the dialog didn't report (or deleted): follow the
    // first project, or go back to "create one".
    const fallback = projects[0]?.id ?? null;
    if (fallback !== projectId) setProject(fallback);
  }, [projects, isFetching, status, projectId, canCreate, start, setProject]);

  const onProjectsList = location.pathname === '/projects';
  useGuideSpot(
    status === 'active' &&
      !projectId &&
      !onProjectsList && {
        id: 'nav-projects',
        target: '[data-tour="projects"]',
        step: 'project',
        placement: 'right',
        floatWhenMissing: true,
        title: 'Start with your first project',
        body: 'A project connects one source platform to HubSpot. Open Projects to create it. It takes about two minutes.',
      },
  );

  return <GuideLayer />;
}
