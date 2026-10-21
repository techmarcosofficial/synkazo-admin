import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IndividualSchedulerList from './IndividualSchedulerList';

import { jobsApi } from '@/api/jobs';
import type { SchedulerJob } from '@/types';

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getSchedulerView: vi.fn(),
    pauseSchedule: vi.fn(),
    resumeSchedule: vi.fn(),
    setSyncEnabled: vi.fn(),
    pauseAllJobs: vi.fn(),
    resumeAllJobs: vi.fn(),
    updateJob: vi.fn(),
  },
}));
vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));
vi.mock('@/features/jobs/components/schedule/JobScheduleModal', () => ({
  default: ({
    jobId,
    saveSchedule,
    onOpenChange,
  }: {
    jobId: string;
    saveSchedule?: (payload: object) => Promise<unknown>;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div role="dialog">
      Schedule editor for {jobId}
      <button
        onClick={async () => {
          await saveSchedule?.({
            scheduleMode: 'daily_time',
            scheduleTimes: ['10:00'],
            scheduleDays: null,
            intervalMinutes: null,
            timezone: 'UTC',
            cronExpression: null,
          });
          onOpenChange(false);
        }}
      >
        Apply schedule
      </button>
    </div>
  ),
}));

const jobs: SchedulerJob[] = [
  {
    id: 'job-1',
    projectId: 'project-1',
    name: 'Customers',
    sourceObject: 'customers',
    destObject: 'contacts',
    status: 'active',
    syncDirection: 'one_way',
    syncEnabled: true,
    isEnabled: true,
    scheduleState: 'active',
    scheduleMode: 'daily_time',
    scheduleTimes: ['09:00'],
    cronExpression: '0 * * * *',
    timezone: 'America/New_York',
  },
];

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(jobsApi.getSchedulerView).mockResolvedValue(jobs);
});

describe('IndividualSchedulerList', () => {
  it('shows a simple schedule list without ordering or an extra save', async () => {
    render(
      <MemoryRouter>
        <IndividualSchedulerList projectId="project-1" />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('link', { name: 'Customers' }),
    ).toHaveAttribute(
      'href',
      '/projects/project-1/jobs/job-1?tab=settings&section=schedule',
    );
    expect(
      screen.getByRole('button', { name: 'Pause all' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Daily at 09:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Schedule editor for job-1',
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Move Customers/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Save Order/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(jobsApi.pauseSchedule).toHaveBeenCalledWith('project-1', 'job-1');
  });

  it('resumes a paused schedule and re-enables its sync gate', async () => {
    vi.mocked(jobsApi.getSchedulerView).mockResolvedValue([
      { ...jobs[0], scheduleState: 'paused', syncEnabled: false },
    ]);
    render(
      <MemoryRouter>
        <IndividualSchedulerList projectId="project-1" />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Resume' });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(jobsApi.resumeSchedule).toHaveBeenCalledWith('project-1', 'job-1');
    await waitFor(() =>
      expect(jobsApi.setSyncEnabled).toHaveBeenCalledWith(
        'project-1',
        'job-1',
        true,
      ),
    );
  });

  it('directs an unscheduled job to configuration without offering Pause', async () => {
    vi.mocked(jobsApi.getSchedulerView).mockResolvedValue([
      {
        ...jobs[0],
        scheduleMode: null,
        scheduleTimes: null,
        cronExpression: null,
      },
    ]);
    render(
      <MemoryRouter>
        <IndividualSchedulerList projectId="project-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Needs schedule')).toBeInTheDocument();
    expect(screen.getByText('No schedule configured')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Configure' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pause' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume all' })).toBeDisabled();
    expect(
      screen.getByText(/No schedules can be paused or resumed/),
    ).toBeInTheDocument();
  });

  it('offers Resume all when a configured schedule has its sync gate off', async () => {
    vi.mocked(jobsApi.getSchedulerView).mockResolvedValue([
      { ...jobs[0], syncEnabled: false },
    ]);
    render(
      <MemoryRouter>
        <IndividualSchedulerList projectId="project-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume all' })).toBeEnabled();
  });

  it('stages a configured schedule without calling the job API before footer Save', async () => {
    const onStageSchedule = vi.fn();
    render(
      <MemoryRouter>
        <IndividualSchedulerList
          projectId="project-1"
          onStageSchedule={onStageSchedule}
        />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Configure' });
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply schedule' }));
    await waitFor(() =>
      expect(onStageSchedule).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ scheduleTimes: ['10:00'] }),
      ),
    );
    expect(jobsApi.updateJob).not.toHaveBeenCalled();
  });
});
