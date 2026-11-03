import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrganisationJobDetailPage from './OrganisationJobDetailPage';
import type { SuperAdminJobDetail, SuperAdminProjectDetail } from '@/types/superAdmin';

const mockJob: SuperAdminJobDetail = {
  id: 'job-1',
  name: 'Customer Sync',
  projectId: 'proj-1',
  sourceObject: 'customers',
  destObject: 'contacts',
  sourceOfTruth: null,
  conflictResolutionStrategy: 'source_wins',
  deleteHandling: 'ignore',
  syncTrigger: 'manual',
  syncDirection: 'one_way',
  isEnabled: true,
  syncEnabled: false,
  isRunning: false,
  status: 'idle',
  recordsSynced: 120,
  lastSyncedAt: '2026-10-30T10:00:00.000Z',
  nextRunAt: null,
  dependsOnJobId: null,
  idMappingSourceField: null,
  idMappingDestField: null,
  hubspotWebhookEnabled: false,
  destPipelineId: null,
  statusMapping: null,
  defaultValues: null,
  excludeConditions: null,
  excludeConditionLogic: 'AND',
  destinationSkipConditions: null,
  skipUpdateOnMatch: false,
  maxRetries: 3,
  retryBackoffBaseSec: 60,
  scheduleMode: null,
  scheduleTimes: null,
  intervalMinutes: null,
  scheduleDays: null,
  timezone: 'UTC',
  cronExpression: null,
  syncAllPage: null,
  fieldMappings: [],
} as unknown as SuperAdminJobDetail;

const mockProject: SuperAdminProjectDetail = {
  id: 'proj-1',
  organisationId: 'org-1',
  name: 'Integration Project',
  description: 'Test project',
  status: 'active',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  activeEnvironment: 'production',
  isLocked: false,
  requiresGuidedSetup: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as SuperAdminProjectDetail;

const mockQueries = vi.hoisted(() => ({
  job: null as SuperAdminJobDetail | null,
  project: null as SuperAdminProjectDetail | null,
  runs: [] as unknown[],
  runJobMutate: vi.fn(),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: { id: 'admin-1', role: 'super_admin' },
    hasRole: () => true,
    hasPermission: () => true,
  }),
}));

vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminJobQuery: () => ({
    data: mockQueries.job,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSuperAdminProjectQuery: () => ({
    data: mockQueries.project,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSuperAdminJobRunsQuery: () => ({
    data: { data: mockQueries.runs, total: mockQueries.runs.length },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRunSuperAdminJobMutation: () => ({
    mutateAsync: mockQueries.runJobMutate,
    isPending: false,
    isError: false,
    reset: vi.fn(),
  }),
  useSuperAdminRunStatusQuery: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
  useSetSuperAdminJobEnabledMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSetSuperAdminJobSyncEnabledMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateSuperAdminJobMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          '/super-admin/organisations/org-1/projects/proj-1/jobs/job-1?tab=overview',
        ]}
      >
        <Routes>
          <Route
            path="/super-admin/organisations/:organisationId/projects/:projectId/jobs/:jobId"
            element={<OrganisationJobDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrganisationJobDetailPage - Field Mapping Gating & Manual Sync Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueries.job = { ...mockJob };
    mockQueries.project = { ...mockProject };
    mockQueries.runs = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('hides the "Sync now" / "Run now" button when field mappings are empty or pending', () => {
    mockQueries.job = {
      ...mockJob,
      fieldMappings: [], // No mappings
    };

    renderPage();

    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run now/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Configure schedule/i)).toBeInTheDocument();
  });

  it('hides the "Sync now" / "Run now" button when mappings exist but no match field is set', () => {
    mockQueries.job = {
      ...mockJob,
      fieldMappings: [
        {
          id: 'fm-1',
          sourceField: 'first_name',
          destField: 'firstname',
          direction: 'one_way',
          onEmpty: null,
          isRequired: false,
          isMatchField: false, // NOT a match field
          defaultValue: null,
          reverseOnEmpty: null,
          reverseDefaultValue: null,
          matchPriority: null,
          updatePolicy: 'always',
          conflictScope: null,
          transformType: 'direct',
          transformConfig: null,
        },
      ],
    };

    renderPage();

    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run now/i })).not.toBeInTheDocument();
  });

  it('renders "Sync now" button when field mapping is complete and opens the "Run manually" modal', async () => {
    mockQueries.job = {
      ...mockJob,
      fieldMappings: [
        {
          id: 'fm-1',
          sourceField: 'email',
          destField: 'email',
          direction: 'one_way',
          onEmpty: null,
          isRequired: true,
          isMatchField: true, // Has match field -> mappingReady: true
          defaultValue: null,
          reverseOnEmpty: null,
          reverseDefaultValue: null,
          matchPriority: 1,
          updatePolicy: 'always',
          conflictScope: null,
          transformType: 'direct',
          transformConfig: null,
        },
      ],
    };

    renderPage();

    const syncNowBtn = screen.getByRole('button', { name: /sync now/i });
    expect(syncNowBtn).toBeInTheDocument();

    // Click "Sync now" to open modal
    fireEvent.click(syncNowBtn);

    // Verify the "Run manually" modal (StartSyncModal) opens
    expect(screen.getByRole('heading', { name: 'Run manually' })).toBeInTheDocument();
    expect(screen.getByText('Limited run')).toBeInTheDocument();
    expect(screen.getByText('All records')).toBeInTheDocument();
  });
});
