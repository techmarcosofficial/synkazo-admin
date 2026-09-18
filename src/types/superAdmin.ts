// Response DTOs for the /super-admin/* API. Intentionally hand-written and
// narrow — do not reuse tenant entity types (which the backend does not
// promise to keep stable) and do not reuse persistence-layer types. Every
// property here is one the Super Admin workspace actually renders.
//
// `SubscriptionStatus` is imported from ./billing (shared with the tenant
// billing screens); `Paginated<T>` is also shared but uses `items: T[]` so
// this file additionally exports `SuperAdminPage<T>` for the {data, total,
// page, limit} response envelope every /super-admin/* list endpoint uses.

import type { SubscriptionStatus } from './billing';

export type OrgStatus = 'active' | 'suspended' | 'pending' | 'archived';

export type { SubscriptionStatus };

export interface SuperAdminOwnerSummary {
  id: string;
  fullName: string | null;
  email: string;
  isActive: boolean;
}

export interface SuperAdminOrganisationListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  subscriptionStatus: SubscriptionStatus;
  owner: SuperAdminOwnerSummary | null;
  plan: { id: string | null; name: string };
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface SuperAdminOrganisationDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: OrgStatus;
  owner: SuperAdminOwnerSummary | null;
  settings: { defaultCurrency: string | null };
  plan: {
    id: string | null;
    name: string;
    subscriptionStatus: SubscriptionStatus;
  };
  access: {
    mode: 'super_admin_organisation_access';
    planRestrictionsBypassed: boolean;
    canManage: boolean;
  };
  usage: {
    members: { total: number; active: number; limit: number | null };
    projects: { count: number; limit: number | null; over: boolean };
    jobs: { count: number; limit: number | null; over: boolean };
    records: {
      used: number;
      limit: number | null;
      remaining: number | null;
      periodStart: string | null;
    };
  };
  paymentHoldActive?: boolean;
  paymentHoldSince?: string | null;
  manualHoldReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminMemberListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: 'editor' | 'org_admin' | 'super_admin';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SuperAdminInvitationListItem {
  id: string;
  email: string;
  role: 'editor' | 'org_admin';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface SuperAdminProjectListItem {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'setup';
  sourcePlatformId: string;
  destPlatformId: string;
  syncMode: string;
  jobCount: number;
  enabledJobCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminProjectDetail extends SuperAdminProjectListItem {
  schedulerMode: string;
  activeEnvironment: string;
  totalRecordsSynced: number;
  totalErrorCount: number;
}

export interface SuperAdminJobListItem {
  id: string;
  projectId: string;
  organisationId: string;
  name: string;
  isEnabled: boolean;
  syncEnabled: boolean;
  isRunning: boolean;
  status: string;
  scheduleState: string;
  syncDirection: string;
  lastSyncedAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminJobDetail extends SuperAdminJobListItem {
  scheduleMode: string | null;
  intervalMinutes: number | null;
  sourceObjectId: string | null;
  destObjectId: string | null;
  dependsOnJobId: string | null;
}

export interface SuperAdminRunStatus {
  bullJobId: string;
  state: string;
  progress: number | Record<string, unknown> | null;
  failedReason: string | null;
}

export interface SuperAdminBillingOverview {
  planName: string;
  planId: string | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentHoldActive: boolean;
  recordUsage: {
    used: number;
    limit: number | null;
    resetsAt: string | null;
  };
}

export interface SuperAdminInvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  dueDate: string | null;
  hostedInvoiceUrl: string | null;
}

export interface SuperAdminActivityEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  userId: string | null;
  userEmail: string | null;
  organisationId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface SuperAdminPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Request DTOs. Never a bare `boolean` or `string` that could accidentally
// carry a bypass — the API derives `platform_override` from the caller's
// identity, never from a request field.

export interface SuperAdminUpdateOrganisationDto {
  name?: string;
  description?: string | null;
  status?: OrgStatus;
  reason?: string;
}

export interface SuperAdminInviteMemberDto {
  email: string;
  role: 'editor' | 'org_admin';
  message?: string;
}

export interface SuperAdminRunJobDto {
  fullSync?: boolean;
  maxRecords?: number;
  startDate?: string;
  endDate?: string;
}

// Lifecycle actions (Phase 4 slice 2). Match the DTOs in
// synkazo-api/src/super-admin/organisations/dto/lifecycle-transition.dto.ts.
export interface TransitionOrganisationStatusDto {
  targetStatus: 'active' | 'suspended' | 'archived';
  confirmName: string;
  reason: string;
}

export interface HoldWorkDto {
  reason?: string;
}

export interface PaymentHoldDto {
  reason: string;
  confirmName: string;
}

export interface ClearPaymentHoldDto {
  reason: string;
}

export interface LifecycleTransitionResponse {
  status: 'active' | 'suspended' | 'archived';
  cascade: {
    pausedJobs?: number;
    queuedRemoved?: number;
    heldJobs?: number;
    resumedJobs?: number;
  };
}

export interface HoldWorkResponse {
  heldJobs: number;
}

export interface ResumeWorkResponse {
  resumedJobs: number;
}

// Platform-wide overview (Phase 3). One aggregate call to avoid client
// fan-out across organisations; every metric is a link to a filtered list
// in the corresponding subsystem screen.
export interface PlatformOverviewResponse {
  generatedAt: string;
  organisations: {
    total: number;
    byStatus: Record<OrgStatus, number>;
    bySubscriptionStatus: Record<SubscriptionStatus, number>;
    pastDueCount: number;
    suspendedCount: number;
  };
  jobs: {
    queue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      workerOnline: boolean;
    };
  };
  recentAlerts: Array<{
    id: string;
    action: string;
    resource: string | null;
    resourceId: string | null;
    severity: 'info' | 'warning' | 'critical';
    userEmail: string | null;
    organisationId: string | null;
    summary: string;
    createdAt: string;
  }>;
}
