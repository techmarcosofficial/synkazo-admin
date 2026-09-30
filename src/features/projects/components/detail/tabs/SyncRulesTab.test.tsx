import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SyncRulesTab, { getJobLifecycle } from './SyncRulesTab';
import { useProjectDetailContext } from '../context';
import { useJobDetailQuery } from '@/features/jobs/hooks';
import type { JobExt } from '@/features/projects/hooks';

vi.mock('../context', () => ({
  useProjectDetailContext: vi.fn(),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: () => true,
    user: { id: 'u1', email: 'test@example.com' },
  }),
}));

vi.mock('@/queries/useEntitlements', () => ({
  useEntitlements: () => ({
    data: { plan: 'growth', isCustomAllowed: true },
    isLoading: false,
  }),
}));

vi.mock('@/components/shared/PlanGate', () => ({
  usePlanUpgradePrompt: () => ({
    dialog: null,
    promptUpgrade: vi.fn(),
  }),
}));

vi.mock('@/features/jobs/hooks', () => ({
  useJobDetailQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

describe('getJobLifecycle', () => {
  it('identifies unmapped jobs as needs_mapping with primary Configure Mapping CTA', () => {
    const job: JobExt = {
      id: 'job-1',
      projectId: 'proj-1',
      name: 'Customers to Contacts',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'idle',
      fieldMappings: [],
      isEnabled: false,
      lastSyncedAt: null,
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('needs_mapping');
    expect(lifecycle.scheduleText).toBe('Setup required');
    expect(lifecycle.actionLabel).toBe('Configure Mapping');
    expect(lifecycle.actionVariant).toBe('default');
    expect(lifecycle.targetUrl).toBe('/projects/proj-1/jobs/job-1?tab=field-mapping');
    expect(lifecycle.isActionable).toBe(true);
  });

  it('identifies draft jobs as needs_mapping', () => {
    const job: JobExt = {
      id: 'job-draft',
      projectId: 'proj-1',
      name: 'Jobs to Deals',
      sourceObject: 'jobs',
      destObject: 'deals',
      status: 'draft',
      fieldMappings: [{ id: 'm-1', jobId: 'job-draft', sourceField: 'id', destField: 'id', direction: 'forward_only' }],
      isEnabled: false,
      lastSyncedAt: null,
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('needs_mapping');
    expect(lifecycle.actionLabel).toBe('Configure Mapping');
    expect(lifecycle.targetUrl).toBe('/projects/proj-1/jobs/job-draft?tab=field-mapping');
  });

  it('identifies mapped but untested jobs as ready_to_test with Test & Activate CTA', () => {
    const job: JobExt = {
      id: 'job-2',
      projectId: 'proj-1',
      name: 'Customers to Contacts',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'idle',
      fieldMappings: [
        { id: 'm-1', jobId: 'job-2', sourceField: 'email', destField: 'email', direction: 'forward_only' },
      ],
      isEnabled: false,
      lastSyncedAt: null,
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('ready_to_test');
    expect(lifecycle.scheduleText).toBe('Test pending');
    expect(lifecycle.actionLabel).toBe('Test & Activate');
    expect(lifecycle.actionVariant).toBe('outline');
    expect(lifecycle.targetUrl).toBe('/projects/proj-1/jobs/job-2');
    expect(lifecycle.isActionable).toBe(true);
  });

  it('identifies active running jobs', () => {
    const job: JobExt = {
      id: 'job-3',
      projectId: 'proj-1',
      name: 'Customers to Contacts',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'active',
      fieldMappings: [
        { id: 'm-1', jobId: 'job-3', sourceField: 'email', destField: 'email', direction: 'forward_only' },
      ],
      isEnabled: true,
      isRunning: true,
      lastSyncedAt: '2026-09-26T10:00:00Z',
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('running');
    expect(lifecycle.actionLabel).toBe('View Details');
    expect(lifecycle.actionVariant).toBe('outline');
  });

  it('identifies error status with Review Error CTA', () => {
    const job: JobExt = {
      id: 'job-err',
      projectId: 'proj-1',
      name: 'Customers to Contacts',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'error',
      fieldMappings: [
        { id: 'm-1', jobId: 'job-err', sourceField: 'email', destField: 'email', direction: 'forward_only' },
      ],
      isEnabled: true,
      lastSyncedAt: '2026-09-26T10:00:00Z',
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('error');
    expect(lifecycle.actionLabel).toBe('Review Error');
    expect(lifecycle.actionVariant).toBe('outline');
  });

  it('identifies active and healthy synced jobs with standard View Details CTA', () => {
    const job: JobExt = {
      id: 'job-4',
      projectId: 'proj-1',
      name: 'Customers to Contacts',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'active',
      fieldMappings: [
        { id: 'm-1', jobId: 'job-4', sourceField: 'email', destField: 'email', direction: 'forward_only' },
      ],
      isEnabled: true,
      lastSyncedAt: '2026-09-26T10:00:00Z',
    };

    const lifecycle = getJobLifecycle(job, null, 'proj-1');

    expect(lifecycle.statusKey).toBe('active');
    expect(lifecycle.actionLabel).toBe('View Details');
    expect(lifecycle.actionVariant).toBe('outline');
    expect(lifecycle.isActionable).toBe(false);
  });
});

describe('SyncRulesTab UI', () => {
  afterEach(cleanup);

  it('renders contextual Configure Mapping button directly on the unmapped job row', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'My Project' },
      jobs: [
        {
          id: 'job-unmapped',
          projectId: 'proj-1',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'idle',
          fieldMappings: [],
          isEnabled: false,
          lastSyncedAt: null,
          syncDirection: 'one_way',
        } as unknown as JobExt,
      ],
      connections: [],
      hasBothConnections: true,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <SyncRulesTab />
      </MemoryRouter>,
    );

    // Job title and objects
    expect(screen.getByText('Customers → Contacts')).toBeInTheDocument();

    // Contextual badge and schedule text on collapsed row
    expect(screen.getByText('Needs Mapping')).toBeInTheDocument();
    expect(screen.getByText('Setup required')).toBeInTheDocument();

    // Primary action button pointing straight to field mapping
    const configureBtn = screen.getByRole('link', { name: /configure mapping/i });
    expect(configureBtn).toHaveAttribute('data-flow-next-action', 'true');
    expect(configureBtn).toBeInTheDocument();
    expect(configureBtn).toHaveAttribute(
      'href',
      '/projects/proj-1/jobs/job-unmapped?tab=field-mapping',
    );
  });

  it('does not render warning/amber border on unmapped job cards', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'My Project' },
      jobs: [
        {
          id: 'job-unmapped',
          projectId: 'proj-1',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'idle',
          fieldMappings: [],
          isEnabled: false,
          lastSyncedAt: null,
          syncDirection: 'one_way',
        } as unknown as JobExt,
      ],
      connections: [],
      hasBothConnections: true,
      refetch: vi.fn(),
    } as any);

    const { container } = render(
      <MemoryRouter>
        <SyncRulesTab />
      </MemoryRouter>,
    );

    // Verify no warning border class
    expect(container.querySelector('.border-warning\\/35')).toBeNull();
    expect(container.querySelector('.bg-warning\\/\\[0\\.03\\]')).toBeNull();
  });

  it('shows one plain-language setup hint on a flow that has not run', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'My Project' },
      jobs: [
        {
          id: 'job-unmapped',
          projectId: 'proj-1',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'idle',
          fieldMappings: [],
          isEnabled: false,
          lastSyncedAt: null,
          syncDirection: 'one_way',
        } as unknown as JobExt,
      ],
      connections: [],
      hasBothConnections: true,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useJobDetailQuery).mockReturnValue({
      data: {
        job: {
          id: 'job-unmapped',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'idle',
          syncDirection: 'one_way',
          recordsSynced: 0,
          lastSyncedAt: null,
          isEnabled: false,
        } as any,
        project: null,
        runLogs: [],
        jobFieldMappings: [],
        hasConnection: true,
        pipelineRequired: false,
        pipelineConfigured: true,
      },
      isLoading: false,
      isError: false,
    } as any);

    render(
      <MemoryRouter>
        <SyncRulesTab />
      </MemoryRouter>,
    );

    // Unmapped / single jobs are open by default with collapse toggle available
    expect(screen.getByRole('button', { name: /collapse customers → contacts/i })).toBeInTheDocument();

    // Clickable job title link to enter job directly
    const titleLink = screen.getByRole('link', { name: 'Customers → Contacts' });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', '/projects/proj-1/jobs/job-unmapped?tab=field-mapping');

    expect(screen.queryByText('Next step')).not.toBeInTheDocument();
    expect(screen.queryByText('Match fields')).not.toBeInTheDocument();
    expect(screen.queryByText('Why it matters')).not.toBeInTheDocument();
    expect(screen.queryByText('Avoid duplicates')).not.toBeInTheDocument();
    expect(screen.queryByText('No schedule')).not.toBeInTheDocument();
    expect(screen.queryByText('Never')).not.toBeInTheDocument();

    expect(
      screen.getByText(/Choose which information moves between platforms/i),
    ).toBeInTheDocument();

    // Ensure Configure Mapping link button exists
    expect(
      screen.getAllByRole('link', { name: /configure mapping/i }),
    ).toHaveLength(1);
  });

  it('renders Create Sync Flow as outline when a job has incomplete configuration', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'My Project' },
      jobs: [
        {
          id: 'job-unmapped',
          projectId: 'proj-1',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'idle',
          fieldMappings: [],
          isEnabled: false,
          lastSyncedAt: null,
          syncDirection: 'one_way',
        } as unknown as JobExt,
      ],
      connections: [],
      hasBothConnections: true,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <SyncRulesTab />
      </MemoryRouter>,
    );

    const createBtn = screen.getByRole('button', { name: /create sync flow/i });
    expect(createBtn).toHaveAttribute('data-variant', 'outline');
  });

  it('renders Create Sync Flow as primary default when all jobs are configured', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'My Project' },
      jobs: [
        {
          id: 'job-mapped',
          projectId: 'proj-1',
          name: 'Customers → Contacts',
          sourceObject: 'customers',
          destObject: 'contacts',
          status: 'active',
          fieldMappings: [
            { id: 'm-1', jobId: 'job-mapped', sourceField: 'email', destField: 'email', direction: 'forward_only' },
          ],
          isEnabled: true,
          lastSyncedAt: '2026-09-26T10:00:00Z',
          syncDirection: 'one_way',
        } as unknown as JobExt,
      ],
      connections: [],
      hasBothConnections: true,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <SyncRulesTab />
      </MemoryRouter>,
    );

    const createBtn = screen.getByRole('button', { name: /create sync flow/i });
    expect(createBtn).toHaveAttribute('data-variant', 'default');
  });
});
