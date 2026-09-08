// features/projects/types.ts

import { z } from 'zod';

import { createProjectSchema } from './utils';

import type {
  Project as BaseProject,
  ProjectStatus,
  ProjectSyncMode,
} from '@/types';

/**
 * Minimal Project type used by form callbacks.
 * Expanded with index signature to allow additional properties from API.
 */
export interface Project {
  id: string;
  name: string;
  [key: string]: any;
}

/**
 * React Hook Form values for Create Project.
 */
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

/**
 * Props for CreateProjectForm.
 */
export interface CreateProjectFormProps {
  onSuccess?: (project: Project) => void;
  onSelectionChange?: (selection: CreateProjectSelection) => void;
}

export interface CreateProjectSelection {
  sourcePlatformId: string;
  syncMode: ProjectSyncMode | '';
}

/**
 * Methods exposed by CreateProjectForm to the drawer.
 */
export interface CreateProjectFormRef {
  submit: () => void;
  reset: () => void;
}
export type { ProjectStatus };

/**
 * Shape actually returned by the projects list endpoint today.
 *
 * NOTE: the API currently returns `activeEnvironment` (camelCase) rather
 * than the `active_environment` field declared on the base `Project`
 * type. Preserved as-is from the original ProjectsList implementation —
 * not changed as part of this refactor.
 */
export type ProjectExtended = BaseProject & {
  activeEnvironment?: 'production' | 'sandbox';
  environmentActivatedAt?: string | null;
  totalRecordsSynced?: number;
  lastSyncedAt?: string;
  description?: string;
};

export type ProjectStatusFilter = 'all' | ProjectStatus;

export interface ProjectFiltersState {
  search: string;
  status: ProjectStatusFilter;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFiltersState = {
  search: '',
  status: 'all',
};

export const PROJECT_STATUS_OPTIONS: {
  value: ProjectStatusFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'error', label: 'Has Errors' },
];
