import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationJobPipelinePanel from './OrganisationJobPipelinePanel';

import type {
  SuperAdminJobDetail,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  statusesRefetch: vi.fn(),
  pipelinesRefetch: vi.fn(),
  statusesData: ['Scheduled', 'In Progress', 'Completed'] as unknown[],
  statusesLoading: false,
  statusesError: false,
  pipelinesData: [
    {
      id: 'pipe-1',
      label: 'Default Pipeline',
      stages: [
        { id: 'stage-1', label: 'New', displayOrder: 1 },
        { id: 'stage-2', label: 'Closed Won', displayOrder: 2 },
      ],
    },
  ],
}));

vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminPipelinesQuery: () => ({
    data: mocks.pipelinesData,
    isLoading: false,
    isError: false,
    refetch: mocks.pipelinesRefetch,
  }),
  useSuperAdminJobSourceStatusesQuery: () => ({
    data: mocks.statusesData,
    isLoading: mocks.statusesLoading,
    isError: mocks.statusesError,
    refetch: mocks.statusesRefetch,
  }),
  useSuperAdminStatusesQuery: () => ({
    data: mocks.statusesData,
    isLoading: mocks.statusesLoading,
    isError: mocks.statusesError,
    refetch: mocks.statusesRefetch,
  }),
  useUpdateSuperAdminJobMutation: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
}));

const mockProject = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'Test Project',
  description: null,
  status: 'active',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  schedulerMode: 'interval',
  activeEnvironment: 'production',
  environmentActivatedAt: null,
  totalRecordsSynced: 0,
  totalErrorCount: 0,
} as unknown as SuperAdminProjectDetail;

const mockJob = {
  id: 'job-1',
  projectId: 'project-1',
  organisationId: 'org-1',
  name: 'Sync Jobs',
  sourceObject: 'jobs',
  destObject: 'deals',
  status: 'active',
  destPipelineId: 'pipe-1',
  statusMapping: {
    Scheduled: 'stage-1',
    Completed: 'stage-2',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as unknown as SuperAdminJobDetail;

describe('OrganisationJobPipelinePanel', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.statusesData = ['Scheduled', 'In Progress', 'Completed'];
    mocks.statusesLoading = false;
    mocks.statusesError = false;
    mocks.update.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders string source statuses in the table without empty cells', async () => {
    render(
      <OrganisationJobPipelinePanel
        organisationId="org-1"
        project={mockProject}
        job={mockJob}
      />,
    );

    // Verify table header
    expect(screen.getByText('Source Status')).toBeInTheDocument();
    expect(screen.getByText('HubSpot Stage')).toBeInTheDocument();

    // Verify all string statuses render in the table cells
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('falls back to job.statusMapping keys when discovered statuses are empty', async () => {
    mocks.statusesData = [];

    render(
      <OrganisationJobPipelinePanel
        organisationId="org-1"
        project={mockProject}
        job={mockJob}
      />,
    );

    expect(screen.getByText('Source Status')).toBeInTheDocument();
    // From mockJob.statusMapping
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    // 'In Progress' was not in mockJob.statusMapping so it should not appear
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
  });

  it('handles object-structured statuses if returned by API', async () => {
    mocks.statusesData = [
      { id: 'st-1', label: 'Booked' },
      { id: 'st-2', label: 'Dispatched' },
    ];

    render(
      <OrganisationJobPipelinePanel
        organisationId="org-1"
        project={mockProject}
        job={mockJob}
      />,
    );

    expect(screen.getByText('Booked')).toBeInTheDocument();
    expect(screen.getByText('Dispatched')).toBeInTheDocument();
  });

  it('validates that all source statuses are mapped before saving', async () => {
    // 3 statuses, but only 1 mapped initially
    render(
      <OrganisationJobPipelinePanel
        organisationId="org-1"
        project={mockProject}
        job={{
          ...mockJob,
          statusMapping: { Scheduled: 'stage-1' }, // Missing Completed & In Progress
        }}
      />,
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(1);

    const saveButton = screen.getByRole('button', {
      name: 'Save pipeline mapping',
    });
    expect(saveButton).toBeInTheDocument();
  });

  it('renders Texada opportunity stages without showing the error alert', async () => {
    mocks.statusesData = ['Prospecting', 'Qualification', 'Negotiation', 'Closed Won'];

    const texadaProject = {
      ...mockProject,
      sourcePlatformId: 'texada',
    } as unknown as SuperAdminProjectDetail;

    const texadaJob = {
      ...mockJob,
      sourceObject: 'opportunities',
      statusMapping: {},
    } as unknown as SuperAdminJobDetail;

    render(
      <OrganisationJobPipelinePanel
        organisationId="org-1"
        project={texadaProject}
        job={texadaJob}
      />,
    );

    expect(screen.getByText('Source Status')).toBeInTheDocument();
    expect(screen.getByText('Prospecting')).toBeInTheDocument();
    expect(screen.getByText('Qualification')).toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
    expect(screen.getByText('Closed Won')).toBeInTheDocument();
    expect(
      screen.queryByText(/Could not load source statuses/i),
    ).not.toBeInTheDocument();
  });
});
