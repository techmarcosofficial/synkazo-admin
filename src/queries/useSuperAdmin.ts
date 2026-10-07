import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { superAdminActivityApi } from '@/api/superAdminActivity';
import { superAdminBillingApi } from '@/api/superAdminBilling';
import { superAdminOrganisationLifecycleApi } from '@/api/superAdminOrganisationLifecycle';
import { superAdminPlatformApi } from '@/api/superAdminPlatform';
import {
  superAdminPlatformBillingApi,
  type ListFailedPaymentsParams,
} from '@/api/superAdminPlatformBilling';
import { superAdminSubscriptionApi } from '@/api/superAdminSubscription';
import {
  superAdminMembersApi,
  type ListInvitationsParams,
  type ListMembersParams,
} from '@/api/superAdminMembers';
import {
  superAdminOperationsApi,
  type ListProjectsParams,
} from '@/api/superAdminOperations';
import {
  superAdminOrganisationsApi,
  type ListSuperAdminOrganisationsParams,
} from '@/api/superAdminOrganisations';
import {
  superAdminFeatureFlagsApi,
  superAdminMarketplaceApi,
} from '@/api/superAdminSettings';
import { superAdminAssociationsApi } from '@/api/superAdminAssociations';
import { superAdminMigrationApi } from '@/api/superAdminMigration';
import type {
  CancelAtPeriodEndDto,
  CancelSubscriptionImmediateDto,
  ClearPaymentHoldDto,
  HoldWorkDto,
  PaymentHoldDto,
  ProvisionOrganisationDto,
  ResumeSubscriptionDto,
  RetryInvoiceDto,
  SuperAdminConnectionEnvironment,
  SuperAdminCreateAssociationRuleDto,
  SuperAdminDeleteAssociationRuleDto,
  SuperAdminInviteMemberDto,
  SuperAdminRevokeInvitationDto,
  SuperAdminRunJobDto,
  SuperAdminRunMigrationDto,
  SuperAdminUpdateAssociationRuleDto,
  SuperAdminUpdateOrganisationDto,
  TransitionOrganisationStatusDto,
  UpsertFeatureFlagDto,
  UpsertMarketplaceCatalogEntryDto,
} from '@/types';

// ── Invoice retry (SA-706) ────────────────────────────────────────────

export function useRetryInvoiceMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { invoiceId: string; dto: RetryInvoiceDto }) =>
      superAdminBillingApi.retryInvoice(
        organisationId,
        params.invoiceId,
        params.dto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'billing'],
      });
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', 'platform', 'failedPayments'],
      });
    },
  });
}

// SA-702 / GAP-051 — assign a plan to the selected organisation. Hits
// the SA-canonical PATCH /billing/plan route (not the legacy
// /billing/admin alias). On success, invalidates every query keyed
// under this org so overview / billing / detail all re-fetch with the
// new plan info.
export function useAssignPlanMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) =>
      superAdminBillingApi.assignPlan(organisationId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.platform.overview,
      });
    },
  });
}

// ── Failed-payments queue (SA-705) ────────────────────────────────────

export function useSuperAdminFailedPaymentsQuery(
  params: ListFailedPaymentsParams = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.platform.failedPayments(page, limit, filters),
    queryFn: () =>
      superAdminPlatformBillingApi.listFailedPayments({
        page,
        limit,
        ...filters,
      }),
    // Auto-refresh cadence matches the overview screen — operators
    // running triage want fresh state without a manual reload.
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ── Platform overview ─────────────────────────────────────────────────

export function useSuperAdminPlatformOverviewQuery(opts?: {
  refetchIntervalMs?: number;
}) {
  return useQuery({
    queryKey: queryKeys.superAdmin.platform.overview,
    queryFn: () => superAdminPlatformApi.overview(),
    // The overview is cheap enough server-side and its cache lifetime is
    // very short; auto-refresh keeps operator situational awareness
    // without a hard-refresh button being the only path to fresh numbers.
    refetchInterval: opts?.refetchIntervalMs ?? 30_000,
    staleTime: 15_000,
  });
}

// ── Organisations ─────────────────────────────────────────────────────

export function useSuperAdminOrganisationsQuery(
  params: ListSuperAdminOrganisationsParams = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.organisations.list(page, limit, filters),
    queryFn: () =>
      superAdminOrganisationsApi.list({ page, limit, ...filters }),
  });
}

export function useSuperAdminOrganisationQuery(
  organisationId: string | undefined,
) {
  return useQuery({
    queryKey: organisationId
      ? queryKeys.superAdmin.organisations.detail(organisationId)
      : ['superAdmin', 'organisations', 'missing'],
    queryFn: () => superAdminOrganisationsApi.get(organisationId!),
    enabled: !!organisationId,
  });
}

export function useUpdateSuperAdminOrganisationMutation(
  organisationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuperAdminUpdateOrganisationDto) =>
      superAdminOrganisationsApi.update(organisationId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.organisations.detail(organisationId),
      });
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', 'organisations'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.orgScope(organisationId),
      });
    },
  });
}

export function useProvisionSuperAdminOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ProvisionOrganisationDto) =>
      superAdminOrganisationsApi.provision(dto),
    onSuccess: () => {
      // A new org shifts every list page + the platform overview totals.
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', 'organisations'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.platform.overview,
      });
    },
  });
}

// ── Lifecycle actions ─────────────────────────────────────────────────

function invalidateOrgAfterLifecycle(
  queryClient: ReturnType<typeof useQueryClient>,
  organisationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.organisations.detail(organisationId),
  });
  queryClient.invalidateQueries({
    queryKey: ['superAdmin', 'organisations'],
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.orgScope(organisationId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.platform.overview,
  });
}

export function useTransitionOrganisationStatusMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: TransitionOrganisationStatusDto) =>
      superAdminOrganisationLifecycleApi.transitionStatus(organisationId, dto),
    onSuccess: () => invalidateOrgAfterLifecycle(queryClient, organisationId),
  });
}

export function useHoldOrganisationWorkMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: HoldWorkDto) =>
      superAdminOrganisationLifecycleApi.hold(organisationId, dto),
    onSuccess: () => invalidateOrgAfterLifecycle(queryClient, organisationId),
  });
}

export function useResumeOrganisationWorkMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      superAdminOrganisationLifecycleApi.resume(organisationId),
    onSuccess: () => invalidateOrgAfterLifecycle(queryClient, organisationId),
  });
}

export function useImposePaymentHoldMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: PaymentHoldDto) =>
      superAdminOrganisationLifecycleApi.imposePaymentHold(organisationId, dto),
    onSuccess: () => invalidateOrgAfterLifecycle(queryClient, organisationId),
  });
}

export function useClearPaymentHoldMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ClearPaymentHoldDto) =>
      superAdminOrganisationLifecycleApi.clearPaymentHold(organisationId, dto),
    onSuccess: () => invalidateOrgAfterLifecycle(queryClient, organisationId),
  });
}

// ── Subscription lifecycle commands (SA-703/704) ──────────────────────

function invalidateOrgBillingAfterCommand(
  queryClient: ReturnType<typeof useQueryClient>,
  organisationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.billing.overview(organisationId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.organisations.detail(organisationId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.orgScope(organisationId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.platform.overview,
  });
}

export function useCancelSubscriptionAtPeriodEndMutation(
  organisationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CancelAtPeriodEndDto) =>
      superAdminSubscriptionApi.cancelAtPeriodEnd(organisationId, dto),
    onSuccess: () =>
      invalidateOrgBillingAfterCommand(queryClient, organisationId),
  });
}

export function useResumeSubscriptionMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ResumeSubscriptionDto) =>
      superAdminSubscriptionApi.resume(organisationId, dto),
    onSuccess: () =>
      invalidateOrgBillingAfterCommand(queryClient, organisationId),
  });
}

export function useCancelSubscriptionImmediateMutation(
  organisationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CancelSubscriptionImmediateDto) =>
      superAdminSubscriptionApi.cancelImmediate(organisationId, dto),
    onSuccess: () =>
      invalidateOrgBillingAfterCommand(queryClient, organisationId),
  });
}

// ── Members + invitations ─────────────────────────────────────────────

export function useSuperAdminMembersQuery(
  organisationId: string,
  params: ListMembersParams = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.members.list(
      organisationId,
      page,
      limit,
      filters,
    ),
    queryFn: () =>
      superAdminMembersApi.listMembers(organisationId, { page, limit, ...filters }),
    enabled: !!organisationId,
  });
}

export function useSuperAdminInvitationsQuery(
  organisationId: string,
  params: ListInvitationsParams = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.invitations.list(
      organisationId,
      page,
      limit,
      filters,
    ),
    queryFn: () =>
      superAdminMembersApi.listInvitations(organisationId, {
        page,
        limit,
        ...filters,
      }),
    enabled: !!organisationId,
  });
}

export function useInviteSuperAdminMemberMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuperAdminInviteMemberDto) =>
      superAdminMembersApi.invite(organisationId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'invitations'],
      });
    },
  });
}

export function useRevokeSuperAdminInvitationMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      invitationId: string;
      dto: SuperAdminRevokeInvitationDto;
    }) =>
      superAdminMembersApi.revokeInvitation(
        organisationId,
        payload.invitationId,
        payload.dto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'invitations'],
      });
    },
  });
}

export function useResendSuperAdminInvitationMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      superAdminMembersApi.resendInvitation(organisationId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'invitations'],
      });
    },
  });
}

// ── Projects + jobs + manual run ──────────────────────────────────────

export function useSuperAdminProjectsQuery(
  organisationId: string,
  params: ListProjectsParams = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.operations.projects(
      organisationId,
      page,
      limit,
      filters,
    ),
    queryFn: () =>
      superAdminOperationsApi.listProjects(organisationId, {
        page,
        limit,
        ...filters,
      }),
    enabled: !!organisationId,
  });
}

export function useSuperAdminProjectQuery(
  organisationId: string,
  projectId: string | undefined,
) {
  return useQuery({
    queryKey: projectId
      ? queryKeys.superAdmin.operations.project(organisationId, projectId)
      : ['superAdmin', organisationId, 'projects', 'missing'],
    queryFn: () => superAdminOperationsApi.getProject(organisationId, projectId!),
    enabled: !!organisationId && !!projectId,
  });
}

export function useSuperAdminJobsQuery(
  organisationId: string,
  projectId: string,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.operations.jobs(organisationId, projectId),
    queryFn: () => superAdminOperationsApi.listJobs(organisationId, projectId),
    enabled: !!organisationId && !!projectId,
  });
}

export function useSuperAdminJobQuery(
  organisationId: string,
  projectId: string,
  jobId: string | undefined,
) {
  return useQuery({
    queryKey: jobId
      ? queryKeys.superAdmin.operations.job(organisationId, projectId, jobId)
      : ['superAdmin', organisationId, 'jobs', 'missing'],
    queryFn: () =>
      superAdminOperationsApi.getJob(organisationId, projectId, jobId!),
    enabled: !!organisationId && !!projectId && !!jobId,
  });
}

export function useRunSuperAdminJobMutation(
  organisationId: string,
  projectId: string,
  jobId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuperAdminRunJobDto) =>
      superAdminOperationsApi.runJob(organisationId, projectId, jobId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.operations.job(
          organisationId,
          projectId,
          jobId,
        ),
      });
    },
  });
}

// Poll status of a run triggered from the workspace. Auto-stops
// polling once BullMQ reports a terminal state (completed/failed);
// the query row stays in cache so the UI can render the final result
// without another network hit.
const TERMINAL_BULL_STATES = new Set(['completed', 'failed']);

export function useSuperAdminRunStatusQuery(
  organisationId: string,
  projectId: string,
  jobId: string,
  bullJobId: string | null,
  refetchIntervalMs: number = 2000,
) {
  return useQuery({
    queryKey: bullJobId
      ? queryKeys.superAdmin.operations.runStatus(
          organisationId,
          projectId,
          jobId,
          bullJobId,
        )
      : ['superAdmin', organisationId, 'runs', 'missing'],
    queryFn: () =>
      superAdminOperationsApi.getRunStatus(
        organisationId,
        projectId,
        jobId,
        bullJobId!,
      ),
    enabled: !!bullJobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state && TERMINAL_BULL_STATES.has(state)) return false;
      return refetchIntervalMs;
    },
  });
}

// GAP-011 — cancel a queued Bull run. Invalidates the run-status query
// so the poller shows the resulting 404 (uniform response for cancelled/
// cross-org/unknown so SA-SEC-001 stays preserved).
export function useSuperAdminCancelRunMutation(
  organisationId: string,
  projectId: string,
  jobId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bullJobId: string) =>
      superAdminOperationsApi.cancelRun(
        organisationId,
        projectId,
        jobId,
        bullJobId,
      ),
    onSuccess: (_data, bullJobId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.operations.runStatus(
          organisationId,
          projectId,
          jobId,
          bullJobId,
        ),
      });
    },
  });
}

// GAP-012 — retry a failed run. Same invalidation as cancel.
export function useSuperAdminRetryRunMutation(
  organisationId: string,
  projectId: string,
  jobId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bullJobId: string) =>
      superAdminOperationsApi.retryRun(
        organisationId,
        projectId,
        jobId,
        bullJobId,
      ),
    onSuccess: (_data, bullJobId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.operations.runStatus(
          organisationId,
          projectId,
          jobId,
          bullJobId,
        ),
      });
    },
  });
}

// GAP-008 / SA-605 — per-project hold + resume. Invalidates the org's
// project + jobs cache so scheduleState changes render immediately.
function invalidateProjectAfterHold(
  queryClient: ReturnType<typeof useQueryClient>,
  organisationId: string,
  projectId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.operations.jobs(organisationId, projectId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.operations.project(organisationId, projectId),
  });
}

export function useHoldSuperAdminProjectMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      superAdminOperationsApi.holdProject(organisationId, projectId, reason),
    onSuccess: () =>
      invalidateProjectAfterHold(queryClient, organisationId, projectId),
  });
}

export function useResumeSuperAdminProjectMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      superAdminOperationsApi.resumeProject(organisationId, projectId, reason),
    onSuccess: () =>
      invalidateProjectAfterHold(queryClient, organisationId, projectId),
  });
}

// ── Billing ───────────────────────────────────────────────────────────

export function useSuperAdminBillingOverviewQuery(organisationId: string) {
  return useQuery({
    queryKey: queryKeys.superAdmin.billing.overview(organisationId),
    queryFn: () => superAdminBillingApi.overview(organisationId),
    enabled: !!organisationId,
  });
}

export function useSuperAdminInvoicesQuery(
  organisationId: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.billing.invoices(
      organisationId,
      page,
      limit,
    ),
    queryFn: () => superAdminBillingApi.invoices(organisationId, { page, limit }),
    enabled: !!organisationId,
  });
}

// ── Activity ──────────────────────────────────────────────────────────

export function useSuperAdminActivityQuery(
  organisationId: string,
  params: { page?: number; limit?: number; action?: string } = {},
) {
  const { page = 1, limit = 20, ...filters } = params;
  return useQuery({
    queryKey: queryKeys.superAdmin.activity.list(
      organisationId,
      page,
      limit,
      filters,
    ),
    queryFn: () =>
      superAdminActivityApi.list(organisationId, { page, limit, ...filters }),
    enabled: !!organisationId,
  });
}

// ── Cache-scope helper ────────────────────────────────────────────────

// Wipe every cached entry for one organisation. Called on Super Admin
// context switch and on leaving the workspace so Organisation A's data
// never bleeds into Organisation B's screens (SA-213).
export function useClearSuperAdminOrgCache() {
  const queryClient = useQueryClient();
  return (organisationId: string) => {
    queryClient.removeQueries({
      queryKey: queryKeys.superAdmin.orgScope(organisationId),
    });
  };
}

// ── Platform settings (GAP-023) ───────────────────────────────────────

// Keyed under a shared `platform.settings.*` namespace so an operator
// action on one topic invalidates only its own cache — the platform
// overview / org-scoped caches are unaffected.
const FEATURE_FLAGS_KEY = ['superAdmin', 'platform', 'featureFlags'] as const;
const MARKETPLACE_KEY = ['superAdmin', 'platform', 'marketplace'] as const;

export function useSuperAdminFeatureFlagsQuery() {
  return useQuery({
    queryKey: FEATURE_FLAGS_KEY,
    queryFn: () => superAdminFeatureFlagsApi.list(),
  });
}

export function useUpsertSuperAdminFeatureFlagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      key: string;
      dto: UpsertFeatureFlagDto;
    }) => superAdminFeatureFlagsApi.upsert(payload.key, payload.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_KEY });
    },
  });
}

export function useSuperAdminMarketplaceQuery() {
  return useQuery({
    queryKey: MARKETPLACE_KEY,
    queryFn: () => superAdminMarketplaceApi.list(),
  });
}

export function useUpsertSuperAdminMarketplaceEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      slug: string;
      dto: UpsertMarketplaceCatalogEntryDto;
    }) => superAdminMarketplaceApi.upsert(payload.slug, payload.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETPLACE_KEY });
    },
  });
}

// ── SA associations + env-migration (GAP-022) ───────────────────────

export function useSuperAdminAssociationRulesQuery(
  organisationId: string,
  projectId: string,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.associations.rules(organisationId, projectId),
    queryFn: () =>
      superAdminAssociationsApi.listRules(organisationId, projectId),
    enabled: !!organisationId && !!projectId,
  });
}

export function useCreateSuperAdminAssociationRuleMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuperAdminCreateAssociationRuleDto) =>
      superAdminAssociationsApi.createRule(organisationId, projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.associations.rules(
          organisationId,
          projectId,
        ),
      });
    },
  });
}

export function useUpdateSuperAdminAssociationRuleMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      ruleId: string;
      dto: SuperAdminUpdateAssociationRuleDto;
    }) =>
      superAdminAssociationsApi.updateRule(
        organisationId,
        projectId,
        payload.ruleId,
        payload.dto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.associations.rules(
          organisationId,
          projectId,
        ),
      });
    },
  });
}

export function useDeleteSuperAdminAssociationRuleMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      ruleId: string;
      dto: SuperAdminDeleteAssociationRuleDto;
    }) =>
      superAdminAssociationsApi.deleteRule(
        organisationId,
        projectId,
        payload.ruleId,
        payload.dto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.associations.rules(
          organisationId,
          projectId,
        ),
      });
    },
  });
}

export function useSuperAdminPendingAssociationsQuery(
  organisationId: string,
  projectId: string,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.associations.pending(
      organisationId,
      projectId,
      page,
      limit,
    ),
    queryFn: () =>
      superAdminAssociationsApi.listPending(organisationId, projectId, {
        page,
        limit,
      }),
    enabled: !!organisationId && !!projectId,
  });
}

export function useSuperAdminMigrationDiffQuery(
  organisationId: string,
  projectId: string,
  from: SuperAdminConnectionEnvironment,
  to: SuperAdminConnectionEnvironment,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.migration.diff(
      organisationId,
      projectId,
      from,
      to,
    ),
    queryFn: () =>
      superAdminMigrationApi.diff(organisationId, projectId, from, to),
    enabled: !!organisationId && !!projectId,
  });
}

export function useSuperAdminMigrationRunsQuery(
  organisationId: string,
  projectId: string,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.migration.runs(organisationId, projectId),
    queryFn: () => superAdminMigrationApi.listRuns(organisationId, projectId),
    enabled: !!organisationId && !!projectId,
  });
}

export function useSuperAdminMigrationRunItemsQuery(
  organisationId: string,
  projectId: string,
  runId: string | null,
) {
  return useQuery({
    queryKey: runId
      ? queryKeys.superAdmin.migration.runItems(organisationId, projectId, runId)
      : ['superAdmin', organisationId, 'projects', projectId, 'migration', 'runs', 'missing'],
    queryFn: () =>
      superAdminMigrationApi.getRunItems(organisationId, projectId, runId!),
    enabled: !!organisationId && !!projectId && !!runId,
  });
}

export function useRunSuperAdminMigrationMutation(
  organisationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuperAdminRunMigrationDto) =>
      superAdminMigrationApi.run(organisationId, projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.superAdmin.migration.runs(organisationId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: [
          'superAdmin',
          organisationId,
          'projects',
          projectId,
          'migration',
          'diff',
        ],
      });
    },
  });
}

// ── SA directory (CAP-006 / CAP-007) ─────────────────────────────────

import { superAdminDirectoryApi } from '@/api/superAdminDirectory';
import { superAdminNotesApi } from '@/api/superAdminNotes';
import { superAdminPlanDefaultsApi } from '@/api/superAdminPlanDefaults';
import type {
  CreateOrganisationNoteDto,
  CreateSuperAdminDto,
  DeactivateSuperAdminDto,
  OrganisationNoteCategory,
  ReactivateSuperAdminDto,
  SuperAdminChangeMemberRoleDto,
  SuperAdminDeactivateMemberDto,
  SuperAdminReactivateMemberDto,
  SuperAdminTransferOwnershipDto,
  UpsertPlanDefaultsDto,
} from '@/types';

const SUPER_ADMINS_KEY = ['superAdmin', 'platform', 'superAdmins'] as const;

export function useSuperAdminDirectoryQuery() {
  return useQuery({
    queryKey: SUPER_ADMINS_KEY,
    queryFn: () => superAdminDirectoryApi.list(),
  });
}

export function useCreateSuperAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { dto: CreateSuperAdminDto; idempotencyKey: string }) =>
      superAdminDirectoryApi.create(payload.dto, payload.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_ADMINS_KEY });
    },
  });
}

export function useDeactivateSuperAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      dto: DeactivateSuperAdminDto;
      idempotencyKey: string;
    }) =>
      superAdminDirectoryApi.deactivate(payload.userId, payload.dto, payload.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_ADMINS_KEY });
    },
  });
}

export function useReactivateSuperAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      dto: ReactivateSuperAdminDto;
      idempotencyKey: string;
    }) =>
      superAdminDirectoryApi.reactivate(payload.userId, payload.dto, payload.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_ADMINS_KEY });
    },
  });
}

// ── Member mutations (GAP-003/4/5) ───────────────────────────────────

function invalidateMembers(
  queryClient: ReturnType<typeof useQueryClient>,
  organisationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['superAdmin', organisationId, 'members'],
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.organisations.detail(organisationId),
  });
}

export function useDeactivateSuperAdminMemberMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      dto: SuperAdminDeactivateMemberDto;
      idempotencyKey: string;
    }) =>
      superAdminMembersApi.deactivateMember(
        organisationId,
        payload.userId,
        payload.dto,
        payload.idempotencyKey,
      ),
    onSuccess: () => invalidateMembers(queryClient, organisationId),
  });
}

export function useReactivateSuperAdminMemberMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      dto: SuperAdminReactivateMemberDto;
      idempotencyKey: string;
    }) =>
      superAdminMembersApi.reactivateMember(
        organisationId,
        payload.userId,
        payload.dto,
        payload.idempotencyKey,
      ),
    onSuccess: () => invalidateMembers(queryClient, organisationId),
  });
}

export function useChangeSuperAdminMemberRoleMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      dto: SuperAdminChangeMemberRoleDto;
      idempotencyKey: string;
    }) =>
      superAdminMembersApi.changeMemberRole(
        organisationId,
        payload.userId,
        payload.dto,
        payload.idempotencyKey,
      ),
    onSuccess: () => invalidateMembers(queryClient, organisationId),
  });
}

export function useTransferOrganisationOwnershipMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      dto: SuperAdminTransferOwnershipDto;
      idempotencyKey: string;
    }) =>
      superAdminMembersApi.transferOwnership(
        organisationId,
        payload.dto,
        payload.idempotencyKey,
      ),
    onSuccess: () => invalidateMembers(queryClient, organisationId),
  });
}

// ── Organisation notes (CAP-029 / CAP-093..097) ─────────────────────

const notesKey = (organisationId: string, category?: OrganisationNoteCategory) =>
  ['superAdmin', organisationId, 'notes', category ?? 'all'] as const;

export function useSuperAdminNotesQuery(
  organisationId: string,
  category?: OrganisationNoteCategory,
) {
  return useQuery({
    queryKey: notesKey(organisationId, category),
    queryFn: () => superAdminNotesApi.list(organisationId, category),
    enabled: !!organisationId,
  });
}

export function useCreateSuperAdminNoteMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      dto: CreateOrganisationNoteDto;
      idempotencyKey: string;
    }) =>
      superAdminNotesApi.create(organisationId, payload.dto, payload.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'notes'],
      });
    },
  });
}

export function useDeleteSuperAdminNoteMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      superAdminNotesApi.delete(organisationId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superAdmin', organisationId, 'notes'],
      });
    },
  });
}

// ── Plan defaults (CAP-039) ──────────────────────────────────────────

const PLAN_DEFAULTS_KEY = ['superAdmin', 'platform', 'planDefaults'] as const;

export function useSuperAdminPlanDefaultsQuery() {
  return useQuery({
    queryKey: PLAN_DEFAULTS_KEY,
    queryFn: () => superAdminPlanDefaultsApi.get(),
  });
}

export function useUpsertSuperAdminPlanDefaultsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      dto: UpsertPlanDefaultsDto;
      idempotencyKey: string;
    }) => superAdminPlanDefaultsApi.upsert(payload.dto, payload.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAN_DEFAULTS_KEY });
    },
  });
}

// ── Project connections (CAP-060 / CAP-061) ─────────────────────────

export function useSuperAdminProjectConnectionsQuery(
  organisationId: string,
  projectId: string,
) {
  return useQuery({
    queryKey: [
      'superAdmin',
      organisationId,
      'projects',
      projectId,
      'connections',
    ],
    queryFn: () =>
      superAdminOperationsApi.listProjectConnections(organisationId, projectId),
    enabled: !!organisationId && !!projectId,
  });
}
