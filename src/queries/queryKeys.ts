import type { AuditLogFilters } from '@/types/audit';

// Central query-key factory. Add a namespace here for each API domain as
// it's migrated onto TanStack Query — keeps invalidation call sites
// consistent instead of hand-writing key arrays everywhere.
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    byProject: (projectId: string) => ['jobs', 'project', projectId] as const,
    detail: (projectId: string, jobId: string) =>
      ['jobs', 'project', projectId, jobId] as const,
    runLogs: (projectId: string, jobId: string, page: number, limit: number) =>
      ['jobs', 'runLogs', projectId, jobId, page, limit] as const,
  },
  connections: {
    all: ['connections'] as const,
    webhookEvents: (
      projectId: string,
      connId: string,
      page: number,
      limit: number,
    ) =>
      ['connections', 'webhookEvents', projectId, connId, page, limit] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    activeSyncs: ['dashboard', 'activeSyncs'] as const,
  },
  scheduler: {
    health: ['scheduler', 'health'] as const,
    queueStats: ['scheduler', 'queueStats'] as const,
  },
  priorityQueue: {
    detail: (projectId: string) => ['priorityQueue', projectId] as const,
  },
  twoWaySync: {
    intervals: ['twoWaySync', 'intervals'] as const,
  },
  hubspotWebhookSettings: {
    detail: ['hubspotWebhookSettings'] as const,
  },
  audit: {
    list: (page: number, limit: number, filters: AuditLogFilters) =>
      ['audit', page, limit, filters] as const,
    platformList: (page: number, limit: number, filters: AuditLogFilters) =>
      ['audit', 'platform', page, limit, filters] as const,
  },
  systemLogs: {
    list: (page: number, limit: number, search: string) =>
      ['systemLogs', page, limit, search] as const,
  },
  activity: {
    list: (projectId: string, page: number, limit: number) =>
      ['activity', projectId, page, limit] as const,
  },
  associations: {
    records: (
      projectId: string,
      ruleId: string,
      page: number,
      limit: number,
      status: string,
      search: string,
    ) =>
      [
        'associations',
        'records',
        projectId,
        ruleId,
        page,
        limit,
        status,
        search,
      ] as const,
    logs: (projectId: string, ruleId: string) =>
      ['associations', 'logs', projectId, ruleId] as const,
    companyOwnerLogs: (projectId: string) =>
      ['associations', 'companyOwnerLogs', projectId] as const,
    companyOwnerResults: (
      projectId: string,
      runId: string | null,
      page: number,
      limit: number,
      status: string,
      search: string,
    ) =>
      [
        'associations',
        'companyOwnerResults',
        projectId,
        runId,
        page,
        limit,
        status,
        search,
      ] as const,
  },
  users: {
    all: ['users'] as const,
    ownershipSummary: ['users', 'me', 'ownershipSummary'] as const,
    projectAccess: (id: string) => ['users', id, 'projectAccess'] as const,
  },
  organisations: {
    all: ['organisations'] as const,
    mine: ['organisations', 'mine'] as const,
  },
  invitations: {
    all: ['invitations'] as const,
  },
  billing: {
    plan: ['billing', 'plan'] as const,
    usage: ['billing', 'usage'] as const,
    plans: (interval?: string) =>
      ['billing', 'plans', interval ?? 'all'] as const,
    subscription: ['billing', 'subscription'] as const,
    paymentMethods: ['billing', 'paymentMethods'] as const,
    invoices: (page: number, limit: number) =>
      ['billing', 'invoices', page, limit] as const,
    history: (page: number, limit: number) =>
      ['billing', 'history', page, limit] as const,
    paymentHistory: (page: number, limit: number) =>
      ['billing', 'payment-history', page, limit] as const,
    adminPlans: ['billing', 'admin', 'plans'] as const,
    pricingSettings: ['billing', 'pricing-settings'] as const,
    adminCoupons: ['billing', 'admin', 'coupons'] as const,
    adminDiscountSettings: ['billing', 'admin', 'discount-settings'] as const,
    adminDiscountRules: ['billing', 'admin', 'discount-rules'] as const,
    upgradePreview: (priceId: string) =>
      ['billing', 'upgrade-preview', priceId] as const,
    checkoutPreview: (priceId: string, couponCode?: string) =>
      ['billing', 'checkout-preview', priceId, couponCode ?? 'none'] as const,
  },
};
