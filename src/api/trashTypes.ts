// Shared trash types for both the platform (super-admin) and org-scoped surfaces.

export type TrashEntityType = 'organisation' | 'project' | 'job';

export interface TrashItem {
  id: string;
  type: TrashEntityType;
  name: string;
  organisationId: string | null;
  organisationName: string | null;
  projectId: string | null;
  projectName: string | null;
  deletedAt: string;
  deletedById: string | null;
  deletionReason: string | null;
  deletionBatchId: string | null;
  daysRemaining: number;
}

export interface TrashDeleteImpact {
  organisationId: string;
  organisationName: string;
  projects: number;
  jobs: number;
}

export interface ListTrashParams {
  type?: TrashEntityType;
  search?: string;
  page?: number;
  limit?: number;
}
