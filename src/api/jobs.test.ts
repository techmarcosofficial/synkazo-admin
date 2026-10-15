import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jobsApi } from './jobs';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./apiClient', () => ({ default: http }));

beforeEach(() => vi.clearAllMocks());

describe('getSchedulerView', () => {
  const jobs = [{ id: 'job-1', name: 'Customers' }];

  it('reads jobs from the current scheduler response', async () => {
    http.get.mockResolvedValue({
      data: { data: { prioritySchedulingEnabled: false, jobs } },
    });

    await expect(jobsApi.getSchedulerView('project-1')).resolves.toEqual(jobs);
    expect(http.get).toHaveBeenCalledWith('/projects/project-1/jobs/scheduler');
  });

  it('also accepts a legacy array response', async () => {
    http.get.mockResolvedValue({ data: { data: jobs } });

    await expect(jobsApi.getSchedulerView('project-1')).resolves.toEqual(jobs);
  });

  it('rejects an invalid response so the list can show its load error', async () => {
    http.get.mockResolvedValue({ data: { data: {} } });

    await expect(jobsApi.getSchedulerView('project-1')).rejects.toThrow(
      'Invalid scheduler response',
    );
  });
});
