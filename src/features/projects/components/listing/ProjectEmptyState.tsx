import { FolderOpen, Plus, RotateCcw } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';
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
