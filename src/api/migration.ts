import apiClient from './apiClient';

import type { ProjectEnvironment } from '@/types';

export interface MigrationDiffItem {
  identityKey: string;
  kind: 'custom_object' | 'property' | 'association';
  displayName: string;
  objectType?: string;
  status: 'missing' | 'conflict' | 'in_sync';
  conflictReason?: string;
}

export interface MigrationDiff {
  from: ProjectEnvironment;
  to: ProjectEnvironment;
  ready: boolean;
  sandboxConnected: boolean;
  productionConnected: boolean;
  message?: string;
  customObjects: MigrationDiffItem[];
  properties: MigrationDiffItem[];
  associations: MigrationDiffItem[];
}

export interface MigrationRunItem {
  id: string;
  kind: string;
  displayName: string;
  status: string;
  errorMessage?: string | null;
}

export interface MigrationRun {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed';
  fromEnvironment: ProjectEnvironment;
  toEnvironment: ProjectEnvironment;
  totalItems: number;
  succeeded: number;
  skipped: number;
  failed: number;
  startedAt: string;
  createdAt: string;
  completedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

const base = (projectId: string) => `/projects/${projectId}/migration`;

export const migrationApi = {
  diff: (
    projectId: string,
    from: ProjectEnvironment = 'sandbox',
    to: ProjectEnvironment = 'production',
  ): Promise<MigrationDiff> =>
    apiClient.get(`${base(projectId)}/diff`, { params: { from, to } }).then(d),

  run: (
    projectId: string,
    selectedKeys: string[],
    from: ProjectEnvironment = 'sandbox',
    to: ProjectEnvironment = 'production',
  ): Promise<MigrationRun> =>
    apiClient
      .post(`${base(projectId)}/run`, { selectedKeys, from, to })
      .then(d),

  listRuns: (projectId: string): Promise<MigrationRun[]> =>
    apiClient.get(`${base(projectId)}/runs`).then(d),

  getRunItems: (
    projectId: string,
    runId: string,
  ): Promise<MigrationRunItem[]> =>
    apiClient.get(`${base(projectId)}/runs/${runId}/items`).then(d),
};
