import apiClient from './apiClient';

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalJobs: number;
  enabledJobs: number;
  totalConnections: number;
  connectedConnections: number;
  totalRecordsSynced: number;
  totalErrors: number;
}

export interface ActiveSync {
  jobId: string;
  jobName: string;
  projectId: string;
  status: string;
  startedAt: string;
  recordsProcessed?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> =>
    apiClient.get('/dashboard/summary').then(d),
  getActiveSyncs: (): Promise<ActiveSync[]> =>
    apiClient.get('/dashboard/active-syncs').then(d),
};
