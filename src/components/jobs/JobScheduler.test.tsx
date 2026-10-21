import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import JobScheduler from './JobScheduler';

import { useProjectJobsQuery } from '@/queries/useJobs';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';
import type { Job, PriorityQueueConfig } from '@/types';

vi.mock('./IndividualSchedulerList', () => ({
  default: () => <div>Individual schedule list</div>,
}));
vi.mock('./priority-queue/PriorityQueuePanel', () => ({
  default: () => <div>Priority scheduler workspace</div>,
}));
vi.mock('@/queries/useJobs', () => ({ useProjectJobsQuery: vi.fn() }));
vi.mock('@/queries/usePriorityQueue', () => ({
  usePriorityQueueQuery: vi.fn(),
}));

const job: Job = {
  id: 'job-1',
  projectId: 'project-1',
  name: 'Customers',
  sourceObject: 'customers',
  destObject: 'contacts',
  status: 'active',
  syncDirection: 'one_way',
};
const config: PriorityQueueConfig = {
  schedulerMode: 'individual',
  queue: null,
  queueJobs: [],
  associationQueueItems: [],
  activeCycle: null,
  currentExecution: null,
  currentQueueJob: null,
  nextQueueJob: null,
  displayStatus: 'idle',
};
const jobsRefetch = vi.fn();
const queueRefetch = vi.fn();

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProjectJobsQuery).mockReturnValue({
    data: [job],
    isLoading: false,
    isError: false,
    refetch: jobsRefetch,
  } as unknown as ReturnType<typeof useProjectJobsQuery>);
  vi.mocked(usePriorityQueueQuery).mockReturnValue({
    data: config,
    isLoading: false,
    isError: false,
    refetch: queueRefetch,
  } as unknown as ReturnType<typeof usePriorityQueueQuery>);
});

describe('JobScheduler', () => {
  it('shows one scheduler workspace for one-way projects', () => {
    render(<JobScheduler projectId="project-1" />);
    expect(
      screen.getByText('Priority scheduler workspace'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Schedule summary card')).not.toBeInTheDocument();
  });

  it('shows the simple schedule list for automatic two-way projects', () => {
    vi.mocked(useProjectJobsQuery).mockReturnValue({
      data: [{ ...job, syncDirection: 'two_way' }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProjectJobsQuery>);
    render(<JobScheduler projectId="project-1" />);
    expect(screen.getByText('Individual schedule list')).toBeInTheDocument();
    expect(
      screen.queryByText('Priority scheduler workspace'),
    ).not.toBeInTheDocument();
  });

  it('retains retry when scheduler data cannot load', () => {
    vi.mocked(useProjectJobsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jobsRefetch,
    } as unknown as ReturnType<typeof useProjectJobsQuery>);
    render(<JobScheduler projectId="project-1" />);
    expect(
      screen.getByText('Schedule settings could not be loaded'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(jobsRefetch).toHaveBeenCalledOnce();
    expect(queueRefetch).toHaveBeenCalledOnce();
  });
});
