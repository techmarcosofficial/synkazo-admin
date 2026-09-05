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

export type DashboardMetricsPeriod =
  'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DashboardMetricsParams {
  period: DashboardMetricsPeriod;
  timezone: string;
  start?: string;
  end?: string;
}

export interface DashboardMetricBucket {
  start: string;
  label: string;
  created: number;
  updated: number;
  successful: number;
  partial: number;
  failed: number;
  stopped: number;
}

export interface DashboardSyncMetrics {
  period: DashboardMetricsPeriod;
  granularity: 'hour' | 'day' | 'month';
  timezone: string;
  range: {
    start: string;
    end: string;
  };
  retention: {
    limited: boolean;
    availableFrom: string | null;
  };
  summary: {
    recordsProcessed: number;
    created: number;
    updated: number;
    terminalRuns: number;
    successful: number;
    partial: number;
    failed: number;
    stopped: number;
    running: number;
    successRate: number | null;
  };
  comparison: {
    recordsProcessedChangePct: number | null;
    successRateChangePoints: number | null;
  };
  buckets: DashboardMetricBucket[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> =>
    apiClient.get('/dashboard/summary').then(d),
  getActiveSyncs: (): Promise<ActiveSync[]> =>
    apiClient.get('/dashboard/active-syncs').then(d),
  getSyncMetrics: (
    params: DashboardMetricsParams,
  ): Promise<DashboardSyncMetrics> =>
    apiClient.get('/dashboard/sync-metrics', { params }).then(d),
};
