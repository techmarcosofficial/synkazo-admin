// Trash types for the platform (super-admin) trash surface. Organisation
// admins have no trash of their own — their deletes are soft but invisible.

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
