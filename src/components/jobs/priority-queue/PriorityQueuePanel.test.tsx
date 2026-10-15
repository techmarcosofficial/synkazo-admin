import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PriorityQueuePanel from './PriorityQueuePanel';

import { jobsApi } from '@/api/jobs';
import { useSetSchedulerModeMutation } from '@/queries/usePriorityQueue';

vi.mock('@/api/jobs', () => ({
  jobsApi: { updateJob: vi.fn().mockResolvedValue({}) },
}));

const queueConfig = vi.hoisted(() => ({
  schedulerMode: 'individual',
  queue: null,
  queueJobs: [],
  associationQueueItems: [],
}));

vi.mock('./AssociationQueueCard', () => ({
  default: () => <div>Association queue card</div>,
}));
vi.mock('./QueueJobList', () => ({
  default: () => <div>Priority job list</div>,
}));
vi.mock('./QueueJobInlineEditor', () => ({
  default: () => null,
  queueJobValuesToPayload: vi.fn(),
}));
vi.mock('./QueueScheduleCard', () => ({
  default: () => <div>Cycle schedule</div>,
  queueScheduleDraft: () => ({
    scheduleMode: 'daily_time',
    scheduleTimes: ['02:00'],
    timezone: 'UTC',
  }),
  queueScheduleValid: () => true,
}));
vi.mock('./QueueStatusPanel', () => ({
  default: () => <div>Live status</div>,
}));
vi.mock('../IndividualSchedulerList', () => ({
  default: ({
    onStageSchedule,
  }: {
    onStageSchedule: (jobId: string, draft: object) => void;
  }) => (
    <div>
      Project job schedules
      <button
        onClick={() =>
          onStageSchedule('job-1', {
            scheduleMode: 'daily_time',
            scheduleTimes: ['10:00'],
            scheduleDays: null,
            intervalMinutes: null,
            timezone: 'UTC',
            cronExpression: null,
          })
        }
      >
        Stage job schedule
      </button>
    </div>
  ),
}));
vi.mock('@/queries/useEntitlements', () => ({
  useEntitlements: () => ({ priorityScheduling: true }),
}));
vi.mock('@/queries/useJobs', () => ({
  useProjectJobsQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/queries/useProjects', () => ({
  useProjectQuery: () => ({ data: null }),
}));
vi.mock('@/queries/usePriorityQueue', () => {
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
  return {
    usePriorityQueueQuery: () => ({
      data: queueConfig,
      isLoading: false,
    }),
    useSetSchedulerModeMutation: vi.fn(mutation),
    useUpdateQueueScheduleMutation: mutation,
    useAddQueueJobMutation: mutation,
    useUpdateQueueJobMutation: mutation,
    useRemoveQueueJobMutation: mutation,
    useReorderQueueJobsMutation: mutation,
    useUpdateAssociationConfigMutation: mutation,
    useRetryQueueJobMutation: mutation,
    usePauseQueueMutation: mutation,
    useResumeQueueMutation: mutation,
    useClearAndRestartQueueMutation: mutation,
  };
});

afterEach(cleanup);

describe('PriorityQueuePanel', () => {
  it('stages mode changes until the single footer Save', async () => {
    const setMode = vi.fn().mockResolvedValue({});
    vi.mocked(useSetSchedulerModeMutation).mockReturnValue({
      mutateAsync: setMode,
      isPending: false,
    } as unknown as ReturnType<typeof useSetSchedulerModeMutation>);
    render(<PriorityQueuePanel projectId="project-1" />);
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable priority scheduler' }),
    );
    expect(setMode).not.toHaveBeenCalled();
    expect(screen.getByText('Priority job list')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Save changes' }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(setMode).toHaveBeenCalledWith(true));
  });

  it('keeps a job schedule edit pending until the shared footer Save', async () => {
    render(<PriorityQueuePanel projectId="project-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Stage job schedule' }));
    expect(jobsApi.updateJob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(jobsApi.updateJob).toHaveBeenCalledWith(
        'project-1',
        'job-1',
        expect.objectContaining({ scheduleTimes: ['10:00'] }),
      ),
    );
  });
});
