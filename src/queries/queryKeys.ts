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
    runLogs: (
      projectId: string,
      jobId: string,
      page: number,
      limit: number,
      filters?: object,
    ) =>
      [
        'jobs',
        'runLogs',
        projectId,
        jobId,
        page,
        limit,
        filters ?? {},
      ] as const,
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
    syncMetrics: (
      period: string,
      timezone: string,
      start?: string,
      end?: string,
    ) =>
      [
        'dashboard',
        'syncMetrics',
        period,
        timezone,
        start ?? null,
        end ?? null,
      ] as const,
  },
  scheduler: {
    health: ['scheduler', 'health'] as const,
    queueStats: ['scheduler', 'queueStats'] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
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
  authPagesSettings: {
    detail: ['authPagesSettings'] as const,
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
  leads: {
    all: ['leads'] as const,
    list: (page: number, limit: number, status?: string, search?: string) =>
      ['leads', page, limit, status ?? 'all', search ?? ''] as const,
    notificationSettings: ['leads', 'notification-settings'] as const,
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
    detail: (id: string) => ['organisations', id] as const,
    mine: ['organisations', 'mine'] as const,
  },
  invitations: {
    all: ['invitations'] as const,
  },
  // Super Admin workspace. Every org-scoped key includes organisationId in
  // its second slot so React Query never returns Organisation A's cached
  // data while the sidebar is displaying Organisation B (SA-202, SA-213).
  superAdmin: {
    platform: {
      overview: ['superAdmin', 'platform', 'overview'] as const,
      failedPayments: (
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) =>
        [
          'superAdmin',
          'platform',
          'failedPayments',
          page,
          limit,
          filters,
        ] as const,
    },
    organisations: {
      list: (
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) => ['superAdmin', 'organisations', page, limit, filters] as const,
      detail: (organisationId: string) =>
        ['superAdmin', 'organisations', organisationId] as const,
    },
    members: {
      list: (
        organisationId: string,
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) =>
        [
          'superAdmin',
          organisationId,
          'members',
          page,
          limit,
          filters,
        ] as const,
    },
    invitations: {
      list: (
        organisationId: string,
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) =>
        [
          'superAdmin',
          organisationId,
          'invitations',
          page,
          limit,
          filters,
        ] as const,
    },
    operations: {
      projects: (
        organisationId: string,
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) =>
        [
          'superAdmin',
          organisationId,
          'projects',
          page,
          limit,
          filters,
        ] as const,
      project: (organisationId: string, projectId: string) =>
        ['superAdmin', organisationId, 'projects', projectId] as const,
      jobs: (organisationId: string, projectId: string) =>
        ['superAdmin', organisationId, 'projects', projectId, 'jobs'] as const,
      job: (organisationId: string, projectId: string, jobId: string) =>
        [
          'superAdmin',
          organisationId,
          'projects',
          projectId,
          'jobs',
          jobId,
        ] as const,
      runStatus: (
        organisationId: string,
        projectId: string,
        jobId: string,
        bullJobId: string,
      ) =>
        [
          'superAdmin',
          organisationId,
          'projects',
          projectId,
          'jobs',
          jobId,
          'runs',
          bullJobId,
        ] as const,
    },
    billing: {
      overview: (organisationId: string) =>
        ['superAdmin', organisationId, 'billing', 'overview'] as const,
      invoices: (organisationId: string, page: number, limit: number) =>
        [
          'superAdmin',
          organisationId,
          'billing',
          'invoices',
          page,
          limit,
        ] as const,
    },
    activity: {
      list: (
        organisationId: string,
        page: number,
        limit: number,
        filters: Record<string, unknown> = {},
      ) =>
        [
          'superAdmin',
          organisationId,
          'activity',
          page,
          limit,
          filters,
        ] as const,
    },
    // Prefix used to nuke every cached entry for one organisation on
    // context switch. Any org-scoped key above lives under
    // ['superAdmin', <organisationId>, ...] — so removing that prefix
    // invalidates the whole workspace in one line (SA-213).
    orgScope: (organisationId: string) =>
      ['superAdmin', organisationId] as const,
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
