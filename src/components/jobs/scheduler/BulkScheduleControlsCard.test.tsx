import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BulkScheduleControlsCard from './BulkScheduleControlsCard';

import { jobsApi } from '@/api/jobs';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import type { Job } from '@/types';

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    pauseAllJobs: vi.fn(),
    resumeAllJobs: vi.fn(),
  },
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const activeJob: Job = {
  id: 'job-1',
  projectId: 'project-1',
  name: 'Customers',
  sourceObject: 'customers',
  destObject: 'contacts',
  status: 'active',
  syncDirection: 'one_way',
  syncEnabled: true,
  scheduleState: 'active',
};

const pausedJob: Job = {
  ...activeJob,
  id: 'job-2',
  name: 'Locations',
  scheduleState: 'paused',
};

const confirmMock = vi.fn();

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConfirmDialog).mockReturnValue({ confirm: confirmMock });
});

describe('BulkScheduleControlsCard', () => {
  it('confirms the known affected count and reports the backend result', async () => {
    const onChanged = vi.fn();
    vi.mocked(jobsApi.pauseAllJobs).mockResolvedValue({ affected: 1 });

    render(
      <BulkScheduleControlsCard
        projectId="project-1"
        jobs={[activeJob, pausedJob]}
        priorityMode={false}
        onChanged={onChanged}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Pause active (1)' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Resume paused (1)' }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Pause active (1)' }));
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pause 1 active schedule?',
        confirmLabel: 'Pause schedules',
      }),
    );

    const confirmation = confirmMock.mock.calls[0][0];
    await act(async () => {
      await confirmation.onConfirm();
    });

    expect(jobsApi.pauseAllJobs).toHaveBeenCalledWith('project-1');
    expect(showToast.success).toHaveBeenCalledWith('1 job schedule paused.');
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it('explains that bulk controls affect saved schedules in priority mode', () => {
    render(
      <BulkScheduleControlsCard
        projectId="project-1"
        jobs={[activeJob, pausedJob]}
        priorityMode
        onChanged={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/priority mode continues to override them/i),
    ).toBeInTheDocument();
  });
});
