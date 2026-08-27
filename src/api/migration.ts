import apiClient from './apiClient';

import type { ProjectEnvironment } from '@/types';

export interface MigrationDiffItem {
  identityKey: string;
  type: string;
  status: 'missing' | 'conflict' | 'in_sync';
  label?: string;
  sourceData?: unknown;
  targetData?: unknown;
}

export interface MigrationRun {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  selectedKeys: string[];
  from: ProjectEnvironment;
  to: ProjectEnvironment;
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
  ): Promise<MigrationDiffItem[]> =>
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
  ): Promise<MigrationDiffItem[]> =>
    apiClient.get(`${base(projectId)}/runs/${runId}/items`).then(d),
};
