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

export interface SuperAdminOrganisationListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  subscriptionStatus: SubscriptionStatus;
  plan: string;
  ownerEmail: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminOrganisationDetail
  extends SuperAdminOrganisationListItem {
  description: string | null;
  logoUrl: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  paymentHoldActive: boolean;
  paymentHoldSince: string | null;
  manualHoldReason: string | null;
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
