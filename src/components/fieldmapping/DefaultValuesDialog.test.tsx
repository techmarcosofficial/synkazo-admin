import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DefaultValuesDialog from './DefaultValuesDialog';

import { jobsApi } from '@/api/jobs';
import type { Job } from '@/types/job';

vi.mock('@/api/jobs', () => ({
  jobsApi: { updateJob: vi.fn() },
}));

const fields = [
  { key: 'lead_source', label: 'Lead Source', type: 'string' },
  { key: 'probability', label: 'Probability', type: 'number' },
];

const job: Job = {
  id: 'job-1',
  projectId: 'project-1',
  name: 'Customers',
  sourceObject: 'customers',
  destObject: 'contacts',
  status: 'active',
  syncDirection: 'one_way',
  defaultValues: { destination: { lead_source: 'ServiceTitan' } },
};

const props = {
  open: true,
  onOpenChange: vi.fn(),
  projectId: 'project-1',
  job,
  sourceFields: fields,
  destinationFields: fields,
  sourcePlatform: 'ServiceTitan',
  destinationPlatform: 'HubSpot',
  mappedSourceKeys: [],
  mappedDestinationKeys: [],
  mappings: [],
  onSaved: vi.fn(),
};

describe('DefaultValuesDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows only destination defaults for one-way jobs and saves an unmapped field', async () => {
    vi.mocked(jobsApi.updateJob).mockResolvedValue(job);
    render(<DefaultValuesDialog {...props} />);
    expect(screen.getByText('Destination Defaults')).toBeInTheDocument();
    expect(screen.queryByText('Source Defaults')).not.toBeInTheDocument();
    expect(
      screen.getByText('Unmapped; applied to every written record.'),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Destination Defaults value 1' }),
      {
        target: { value: 'New Source' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(jobsApi.updateJob).toHaveBeenCalledWith('project-1', 'job-1', {
        defaultValues: { destination: { lead_source: 'New Source' } },
      }),
    );
  });

  it('shows both directions for two-way jobs and keeps numeric values typed', async () => {
    const twoWayJob: Job = {
      ...job,
      syncDirection: 'two_way',
      defaultValues: {
        destination: { lead_source: 'ServiceTitan' },
        source: { probability: 50 },
      },
    };
    vi.mocked(jobsApi.updateJob).mockResolvedValue(twoWayJob);
    render(<DefaultValuesDialog {...props} job={twoWayJob} />);
    expect(screen.getByText('Destination Defaults')).toBeInTheDocument();
    expect(screen.getByText('Source Defaults')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All Defaults (2)' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(jobsApi.updateJob).toHaveBeenCalledWith('project-1', 'job-1', {
        defaultValues: twoWayJob.defaultValues,
      }),
    );
  });
});
