import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import IndividualSchedulerList from './IndividualSchedulerList';

import { jobsApi } from '@/api/jobs';
import type { SchedulerJob } from '@/types';

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getSchedulerView: vi.fn(),
    updatePriorities: vi.fn(),
    pauseSchedule: vi.fn(),
    resumeSchedule: vi.fn(),
    setSyncEnabled: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
    cronExpression: '0 * * * *',
    timezone: 'America/New_York',
  },
  {
    id: 'job-2',
    projectId: 'project-1',
    name: 'Locations',
    sourceObject: 'locations',
    destObject: 'companies',
    status: 'active',
    syncDirection: 'one_way',
    syncEnabled: true,
    isEnabled: true,
    scheduleState: 'active',
    cronExpression: '0 0 * * *',
    timezone: 'America/Chicago',
  },
];

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(jobsApi.getSchedulerView).mockResolvedValue(jobs);
});

describe('IndividualSchedulerList', () => {
  it('keeps schedule context visible and links expanded rows to job scheduling', async () => {
    render(
      <MemoryRouter>
        <IndividualSchedulerList projectId="project-1" />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Every hour · America/New_York'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move Customers up' }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Move Customers down' }),
    );
    expect(
      screen.getByRole('button', { name: 'Save Order' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Customers' }));
    expect(screen.getByRole('link', { name: 'Edit schedule' })).toHaveAttribute(
      'href',
      '/projects/project-1/jobs/job-1?tab=schedule',
    );
  });
});
