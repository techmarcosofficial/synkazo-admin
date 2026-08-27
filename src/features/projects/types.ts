// features/projects/types.ts

import { z } from 'zod';

import { createProjectSchema } from './utils';

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
 * Platform option used by the PlatformSelector component.
 */
export interface PlatformOption {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

/**
 * Props for CreateProjectForm.
 */
export interface CreateProjectFormProps {
  onSuccess?: (project: Project) => void;
}

/**
 * Methods exposed by CreateProjectForm to the drawer.
 */
export interface CreateProjectFormRef {
  submit: () => void;
  reset: () => void;
}
import type { Project as BaseProject, ProjectStatus } from '@/types';

export type { ProjectStatus };
export type { Project as BaseProject } from '@/types';

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

export type ProjectViewMode = 'card' | 'list';

export type ProjectStatusFilter = 'all' | ProjectStatus;

export type ProjectEnvironmentFilter = 'all' | 'production' | 'sandbox';

export interface ProjectFiltersState {
  search: string;
  status: ProjectStatusFilter;
  environment: ProjectEnvironmentFilter;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFiltersState = {
  search: '',
  status: 'all',
  environment: 'all',
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

export const PROJECT_ENVIRONMENT_OPTIONS: {
  value: ProjectEnvironmentFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All environments' },
  { value: 'production', label: 'Live' },
  { value: 'sandbox', label: 'Test Mode' },
];
