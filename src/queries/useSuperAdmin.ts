import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { superAdminActivityApi } from '@/api/superAdminActivity';
import { superAdminBillingApi } from '@/api/superAdminBilling';
import { superAdminOrganisationLifecycleApi } from '@/api/superAdminOrganisationLifecycle';
import { superAdminPlatformApi } from '@/api/superAdminPlatform';
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
import type {
  CancelAtPeriodEndDto,
  CancelSubscriptionImmediateDto,
  ClearPaymentHoldDto,
  HoldWorkDto,
  PaymentHoldDto,
  ResumeSubscriptionDto,
  SuperAdminInviteMemberDto,
  SuperAdminRunJobDto,
  SuperAdminUpdateOrganisationDto,
  TransitionOrganisationStatusDto,
} from '@/types';

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
    mutationFn: (invitationId: string) =>
      superAdminMembersApi.revokeInvitation(organisationId, invitationId),
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
