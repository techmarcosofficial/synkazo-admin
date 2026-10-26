import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationProjectActivityTab from './OrganisationProjectActivityTab';

import type { ActivityLog } from '@/api/activity';
import type {
  SuperAdminJobListItem,
  SuperAdminProjectDetail,
} from '@/types/superAdmin';

const mocks = vi.hoisted(() => ({
  activityData: {
    data: [
      {
        id: 'log-1',
        projectId: 'proj-1',
        jobId: 'job-1',
        level: 'success',
        message: 'Sync succeeded',
        recordsProcessed: 125,
        durationMs: 4500,
        createdAt: '2026-10-26T12:00:00Z',
        metadata: {
          jobName: 'Opportunities → Deals',
          sourcePlatformId: 'texada',
          destPlatformId: 'hubspot',
          sourceObject: 'opportunities',
          destObject: 'deals',
          status: 'success',
          recordsProcessed: 125,
          recordsFailed: 0,
          triggeredBy: 'cron',
        },
      },
      {
        id: 'log-2',
        projectId: 'proj-1',
        jobId: 'job-2',
        level: 'error',
        message: 'Rate limit exceeded on destination',
        recordsProcessed: 5,
        durationMs: 1200,
        createdAt: '2026-10-26T11:00:00Z',
        metadata: {
          jobName: 'Customers → Companies',
          sourcePlatformId: 'texada',
          destPlatformId: 'hubspot',
          sourceObject: 'customers',
          destObject: 'companies',
          status: 'failed',
          recordsProcessed: 5,
          recordsFailed: 2,
          triggeredBy: 'manual',
        },
      },
    ] as unknown as ActivityLog[],
    total: 2,
    page: 1,
    limit: 20,
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock('@/queries/useActivity', () => ({
  useProjectActivityQuery: () => ({
    data: mocks.activityData,
    isLoading: mocks.isLoading,
    isFetching: mocks.isFetching,
    isError: mocks.isError,
    refetch: mocks.refetch,
  }),
}));

const mockProject = {
  id: 'proj-1',
  organisationId: 'org-1',
  name: 'Titan Rentals Project',
  sourcePlatformId: 'texada',
  destPlatformId: 'hubspot',
} as unknown as SuperAdminProjectDetail;

const mockJobs: SuperAdminJobListItem[] = [
  {
    id: 'job-1',
    name: 'Opportunities → Deals',
    sourceObject: 'opportunities',
    destObject: 'deals',
    status: 'active',
    isEnabled: true,
    syncDirection: 'one_way',
    scheduleState: 'active',
    lastSyncedAt: '2026-10-26T12:00:00Z',
    nextRunAt: '2026-10-26T13:00:00Z',
    isRunning: false,
  },
  {
    id: 'job-2',
    name: 'Customers → Companies',
    sourceObject: 'customers',
    destObject: 'companies',
    status: 'active',
    isEnabled: true,
    syncDirection: 'one_way',
    scheduleState: 'active',
    lastSyncedAt: '2026-10-26T11:00:00Z',
    nextRunAt: '2026-10-26T12:00:00Z',
    isRunning: false,
  },
] as unknown as SuperAdminJobListItem[];

describe('OrganisationProjectActivityTab', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.isLoading = false;
    mocks.isFetching = false;
    mocks.isError = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sync activity list with record counts, trigger badges, and Super Admin links', () => {
    render(
      <MemoryRouter>
        <OrganisationProjectActivityTab
          organisationId="org-1"
          projectId="proj-1"
          project={mockProject}
          jobs={mockJobs}
        />
      </MemoryRouter>,
    );

    // Header title and counts
    expect(screen.getByText('Sync activity')).toBeInTheDocument();
    expect(screen.getByText('2 total events')).toBeInTheDocument();

    // Flow names
    expect(screen.getByText('Opportunities → Deals')).toBeInTheDocument();
    expect(screen.getByText('Customers → Companies')).toBeInTheDocument();

    // Triggers
    expect(screen.getByText('Scheduled run')).toBeInTheDocument();
    expect(screen.getByText('Manual run')).toBeInTheDocument();

    // Record metrics
    expect(screen.getByText('125')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();

    // Super Admin action links
    const runDetailsLinks = screen.getAllByRole('link', { name: /Run details/i });
    expect(runDetailsLinks).toHaveLength(2);
    expect(runDetailsLinks[0]).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/proj-1/jobs/job-1?tab=run-history',
    );
    expect(runDetailsLinks[1]).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/proj-1/jobs/job-2?tab=run-history',
    );

    // Triage button for failed run
    const triageLink = screen.getByRole('link', { name: /Triage/i });
    expect(triageLink).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/proj-1/jobs/job-2?tab=run-history',
    );
  });

  it('renders empty state when there are no sync logs', () => {
    mocks.activityData = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    render(
      <MemoryRouter>
        <OrganisationProjectActivityTab
          organisationId="org-1"
          projectId="proj-1"
          project={mockProject}
          jobs={mockJobs}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No sync activity yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'When a sync job runs, its status, record counts, and timing will appear here.',
      ),
    ).toBeInTheDocument();
  });

  it('renders error state when query fails and allows retry', () => {
    mocks.activityData = null as unknown as typeof mocks.activityData;
    mocks.isError = true;

    render(
      <MemoryRouter>
        <OrganisationProjectActivityTab
          organisationId="org-1"
          projectId="proj-1"
          project={mockProject}
          jobs={mockJobs}
        />
      </MemoryRouter>,
    );

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
