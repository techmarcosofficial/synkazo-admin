export interface AnalyticsFilters {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  currency: string;
  planId?: string;
  organisationId?: string;
}

export interface AnalyticsQuality {
  status: 'reconciled' | 'provisional' | 'partial' | 'unavailable';
  source: string;
  message: string;
  verifiedFrom: string | null;
  verifiedThrough: string | null;
  reconciliationReference: string | null;
}

export interface ProcessingPoint {
  bucket: string;
  completed: number;
  failed: number;
  partial: number;
  running: number;
  terminalRuns: number;
  recordsWritten: number;
  recordsFetched: number;
  durationMs: number;
  missingDurationRuns: number;
  unattributedRuns: number;
  successRate: number | null;
}

export interface PlatformAnalyticsResponse {
  generatedAt: string;
  definitionVersion: 'platform-analytics-v1';
  cohortBasis: 'current-plan';
  range: Pick<AnalyticsFilters, 'from' | 'to' | 'granularity'> & {
    timezone: 'UTC';
  };
  currency: string;
  sections: {
    revenue: {
      collectedMinor: string | null;
      recordedPayments: number;
      unattributedPayments: number;
      currencies: string[];
      series: Array<{
        bucket: string;
        collectedMinor: string | null;
        payments: number;
      }>;
      quality: AnalyticsQuality;
    } | null;
    processing: {
      totals: Omit<ProcessingPoint, 'bucket'>;
      series: ProcessingPoint[];
      quality: AnalyticsQuality;
    } | null;
    customers: {
      asOf: string;
      total: number;
      paidOrganisations: { confirmed: number; unverified: number } | null;
      byStatus: Array<{ status: string; count: number }>;
      bySubscriptionStatus: Array<{ status: string; count: number }>;
      byPlan: Array<{ planId: string | null; name: string; count: number }>;
    } | null;
  };
  unavailableMetrics: Array<{ metric: string; reason: string }>;
  errors: Partial<Record<'revenue' | 'processing' | 'customers', string>>;
}

export interface OrganisationAnalyticsRow {
  organisationId: string;
  name: string;
  status: string;
  archived: boolean;
  planName: string;
  subscriptionStatus: string | null;
  collectedMinor: string | null;
  runs: number;
  recordsWritten: number;
  durationMs: number;
  missingDurationRuns: number;
  failedRuns: number;
  partialRuns: number;
  successRate: number | null;
}

export interface OrganisationAnalyticsResponse {
  generatedAt: string;
  currency: string;
  quality: AnalyticsQuality;
  data: OrganisationAnalyticsRow[];
  total: number;
  page: number;
  limit: number;
}

export interface OrganisationAnalyticsFilters extends AnalyticsFilters {
  page: number;
  limit: number;
  sort: 'duration' | 'runs' | 'records' | 'collections' | 'name';
  direction: 'asc' | 'desc';
  search?: string;
}
