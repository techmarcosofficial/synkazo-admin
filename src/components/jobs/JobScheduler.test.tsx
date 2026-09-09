import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import JobScheduler from './JobScheduler';

import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useEntitlements } from '@/queries/useEntitlements';
import { useProjectJobsQuery } from '@/queries/useJobs';
import {
  usePriorityQueueQuery,
  useSetSchedulerModeMutation,
} from '@/queries/usePriorityQueue';
import type { Job, PriorityQueueConfig } from '@/types';

vi.mock('./IndividualSchedulerList', () => ({
  default: () => <div>Individual schedule list</div>,
}));

vi.mock('./priority-queue/PriorityQueuePanel', () => ({
  default: () => <div>Priority queue panel</div>,
}));

vi.mock('./scheduler/ScheduleSummaryCard', () => ({
  default: () => <div>Schedule summary card</div>,
}));

vi.mock('./scheduler/BulkScheduleControlsCard', () => ({
  default: () => <div>Bulk schedule controls</div>,
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: vi.fn(),
}));

vi.mock('@/queries/useEntitlements', () => ({
  useEntitlements: vi.fn(),
}));

vi.mock('@/queries/useJobs', () => ({
  useProjectJobsQuery: vi.fn(),
}));

vi.mock('@/queries/usePriorityQueue', () => ({
  usePriorityQueueQuery: vi.fn(),
  useSetSchedulerModeMutation: vi.fn(),
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

const confirmMock = vi.fn();
const mutateMock = vi.fn();
const jobsRefetchMock = vi.fn();
const queueRefetchMock = vi.fn();

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConfirmDialog).mockReturnValue({ confirm: confirmMock });
  vi.mocked(useEntitlements).mockReturnValue({
    priorityScheduling: true,
  } as ReturnType<typeof useEntitlements>);
  vi.mocked(useProjectJobsQuery).mockReturnValue({
    data: [job],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: jobsRefetchMock,
  } as unknown as ReturnType<typeof useProjectJobsQuery>);
  vi.mocked(usePriorityQueueQuery).mockReturnValue({
    data: config,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: queueRefetchMock,
  } as unknown as ReturnType<typeof usePriorityQueueQuery>);
  vi.mocked(useSetSchedulerModeMutation).mockReturnValue({
    mutate: mutateMock,
    isPending: false,
  } as unknown as ReturnType<typeof useSetSchedulerModeMutation>);
});

describe('JobScheduler', () => {
  it('lays out independent mode and confirms its high-impact mode change', () => {
    render(<JobScheduler projectId="project-1" />);

    expect(screen.getByText('Schedule summary card')).toBeInTheDocument();
    expect(screen.getByText('Execution mode')).toBeInTheDocument();
    expect(screen.getByText('Bulk schedule controls')).toBeInTheDocument();
    expect(screen.getByText('Job schedules')).toBeInTheDocument();
    expect(screen.getByText('Individual schedule list')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('switch', { name: 'Use priority queue execution' }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enable Priority Scheduling?',
        confirmLabel: 'Enable priority mode',
      }),
    );
    confirmMock.mock.calls[0][0].onConfirm();
    expect(mutateMock).toHaveBeenCalledWith(true, expect.any(Object));

    act(() => {
      mutateMock.mock.calls[0][1].onError();
    });
    expect(
      screen.getByText(
        'Execution mode could not be updated. Please try again.',
      ),
    ).toBeInTheDocument();
  });

  it('shows queue ordering context only in priority mode', () => {
    vi.mocked(usePriorityQueueQuery).mockReturnValue({
      data: { ...config, schedulerMode: 'priority' },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: queueRefetchMock,
    } as unknown as ReturnType<typeof usePriorityQueueQuery>);

    render(<JobScheduler projectId="project-1" />);

    expect(
      screen.getByText('Priority and association queues'),
    ).toBeInTheDocument();
    expect(screen.getByText('Priority queue panel')).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Execution order: Priority Queue, then Association Queue',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Individual schedule list'),
    ).not.toBeInTheDocument();
  });

  it('keeps a retry action visible when scheduler data cannot load', () => {
    vi.mocked(useProjectJobsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: jobsRefetchMock,
    } as unknown as ReturnType<typeof useProjectJobsQuery>);

    render(<JobScheduler projectId="project-1" />);

    expect(
      screen.getByText('Schedule settings could not be loaded'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(jobsRefetchMock).toHaveBeenCalledOnce();
    expect(queueRefetchMock).toHaveBeenCalledOnce();
  });
});
