import { FolderOpen, Plus, RotateCcw } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';
import { useGuideSpot, useGuideStore } from '@/features/guide';
import { useCreateProjectStore } from '@/features/projects/store';
import type { ProjectExtended } from '@/features/projects/types';

interface ProjectEmptyStateProps {
  /** True when there are zero projects at all; false when filters just hide everything. */
  hasNoProjects: boolean;
  onCreated?: (project: ProjectExtended) => void;
  onClearFilters?: () => void;
  canCreate?: boolean;
  viewMode?: 'list' | 'table' | 'card';
}

export default function ProjectEmptyState({
  hasNoProjects,
  onCreated,
  onClearFilters,
  canCreate = true,
  viewMode,
}: ProjectEmptyStateProps) {
  const openCreateProjectDialog = useCreateProjectStore((s) => s.open);
  const guiding = useGuideStore((s) => s.status === 'active' && !s.projectId);

  useGuideSpot(
    guiding &&
      hasNoProjects &&
      canCreate && {
        id: 'create-first-project',
        target: '[data-guide="create-first-project"]',
        step: 'project',
        placement: 'bottom',
        title: 'Create your first project',
        body: 'Give it a name and pick the platform you sync from. HubSpot is already set as the destination.',
      },
  );

  if (hasNoProjects) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        description={
          canCreate
            ? 'A project holds all sync settings for one integration.'
            : 'No projects are available to you yet.'
        }
        action={
          canCreate
            ? {
                label: 'Create your first project',
                onClick: () => openCreateProjectDialog({ onCreated }),
                icon: Plus,
                guideId: 'create-first-project',
              }
            : undefined
        }
        viewMode={viewMode}
      />
    );
  }

  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects match your filters"
      description="Try a different search or status filter."
      action={
        onClearFilters
          ? {
              label: 'Clear filters',
              onClick: onClearFilters,
              icon: RotateCcw,
            }
          : undefined
      }
      viewMode={viewMode}
    />
  );
}
