import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobDetailContextValue } from '../context';
import PipelineTab from './PipelineTab';

import { jobsApi } from '@/api/jobs';

let mockContext: Partial<JobDetailContextValue>;

afterEach(cleanup);

vi.mock('../context', () => ({
  useJobDetailContext: () => mockContext,
}));

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getSourceStatuses: vi.fn(),
    getPipelineStatus: vi.fn(),
    provisionDefaultPipeline: vi.fn(),
    updateJob: vi.fn(),
  },
}));

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PipelineTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      projectId: 'proj-123',
      job: {
        id: 'job-456',
        destObject: 'deals',
        sourceObject: 'jobs',
        destPipelineId: 'pipeline-sales',
        statusMapping: {
          Completed: 'stage-won',
        },
        replicateSourceStatusToPipelineStage: true,
      } as any,
      refetch: vi.fn(),
    };

    vi.mocked(jobsApi.getSourceStatuses).mockResolvedValue([
      'Scheduled',
      'Completed',
      'Canceled',
    ]);

    vi.mocked(jobsApi.getPipelineStatus).mockResolvedValue({
      pipelines: [
        {
          id: 'pipeline-sales',
          label: 'Sales Pipeline',
          stages: [
            {
              id: 'stage-sched',
              label: 'Appointment Scheduled',
              displayOrder: 1,
            },
            { id: 'stage-won', label: 'Closed Won', displayOrder: 2 },
            { id: 'stage-lost', label: 'Closed Lost', displayOrder: 3 },
          ],
        },
      ],
    } as any);

    vi.mocked(jobsApi.updateJob).mockResolvedValue({} as any);
  });

  it('renders pipeline context badge, pipeline selector, and stage preview chips', async () => {
    render(<PipelineTab />);

    await waitFor(() => {
      expect(
        screen.getByText(/Required for HubSpot deals/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('HubSpot Pipeline & Stage Setup'),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Destination Pipeline')).toBeInTheDocument();
    expect(
      screen.getByText('2. Stage Synchronization Mode'),
    ).toBeInTheDocument();

    // Verify stage chips preview
    expect(screen.getByText('Appointment Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Closed Won')).toBeInTheDocument();
    expect(screen.getByText('Closed Lost')).toBeInTheDocument();
  });

  it('renders two visual choice cards and switches between Automatic and Custom mode', async () => {
    render(<PipelineTab />);

    await waitFor(() => {
      expect(screen.getByText('Automatic Matching')).toBeInTheDocument();
    });

    expect(screen.getByText('Custom Stage Mapping')).toBeInTheDocument();

    // Since replicateSourceStatusToPipelineStage is true initially, custom mapping section is hidden
    expect(
      screen.queryByText('3. Status → Stage Mapping'),
    ).not.toBeInTheDocument();

    // Click "Custom Stage Mapping" choice card
    fireEvent.click(screen.getByText('Custom Stage Mapping'));

    // Section 3 should now be revealed
    expect(screen.getByText('3. Status → Stage Mapping')).toBeInTheDocument();
    expect(screen.getByText('Auto-Match Similar')).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Canceled')).toBeInTheDocument();
  });

  it('auto-matches similar statuses to stages when clicking Auto-Match Similar button', async () => {
    mockContext.job!.replicateSourceStatusToPipelineStage = false;
    mockContext.job!.statusMapping = {};

    render(<PipelineTab />);

    await waitFor(() => {
      expect(screen.getByText('3. Status → Stage Mapping')).toBeInTheDocument();
    });

    // Click "Auto-Match Similar"
    fireEvent.click(
      screen.getByRole('button', { name: /Auto-Match Similar/i }),
    );

    // Click Save
    const saveBtn = screen.getByRole('button', {
      name: /Save Pipeline Config/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(jobsApi.updateJob).toHaveBeenCalledWith(
        'proj-123',
        'job-456',
        expect.objectContaining({
          destPipelineId: 'pipeline-sales',
          replicateSourceStatusToPipelineStage: false,
          statusMapping: expect.objectContaining({
            Scheduled: 'stage-sched',
            Completed: 'stage-won',
            Canceled: 'stage-lost',
          }),
        }),
      );
    });
  });

  it('saves pipeline configuration when Save button is clicked', async () => {
    render(<PipelineTab />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save Pipeline Config/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Save Pipeline Config/i }),
    );

    await waitFor(() => {
      expect(jobsApi.updateJob).toHaveBeenCalledWith(
        'proj-123',
        'job-456',
        expect.objectContaining({
          destPipelineId: 'pipeline-sales',
          replicateSourceStatusToPipelineStage: true,
        }),
      );
    });
  });
});
