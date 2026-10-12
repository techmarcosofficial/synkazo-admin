import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StartSyncModal from './StartSyncModal';

import { jobsApi } from '@/api/jobs';
import type { ExtJob } from '@/features/jobs/hooks/useJobDetail';

describe('StartSyncModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([true, false])(
    'keeps the selected start date in the manual all-records dialog (hasBaseline: %s)',
    (hasBaseline) => {
      const onSyncAll = vi.fn();
      render(
        <StartSyncModal
          projectId="project-1"
          jobId="job-1"
          job={{ id: 'job-1', syncDirection: 'one_way' } as ExtJob}
          hasBaseline={hasBaseline}
          onGoToPipeline={vi.fn()}
          onClose={vi.fn()}
          onRunNow={vi.fn()}
          onLimitSyncDone={vi.fn()}
          onSyncAll={onSyncAll}
        />,
      );

      if (!hasBaseline) {
        fireEvent.click(screen.getByText('All records'));
      }

      const startTrigger = screen.getByRole('button', { name: /start date/i });
      fireEvent.click(startTrigger);
      const calendar = document.querySelector('[data-slot="calendar"]');
      expect(calendar).not.toBeNull();
      const dateButton = Array.from(
        within(calendar as HTMLElement).getAllByRole('button'),
      ).find(
        (button) =>
          button.hasAttribute('data-day') && !button.hasAttribute('disabled'),
      );
      expect(dateButton).toBeDefined();
      fireEvent.click(dateButton!);

      expect(startTrigger).not.toHaveTextContent('Start date');
      fireEvent.click(screen.getByRole('button', { name: /run sync now/i }));
      expect(onSyncAll).toHaveBeenCalledWith({
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    },
  );

  it('requires a date for ServiceTitan Customer Contacts limited runs', async () => {
    const limitSync = vi
      .spyOn(jobsApi, 'limitSync')
      .mockResolvedValue({ alreadyRunning: true });
    render(
      <StartSyncModal
        projectId="project-1"
        jobId="job-1"
        job={
          { id: 'job-1', sourceObject: 'contacts', isEnabled: true } as ExtJob
        }
        sourcePlatformId="servicetitan"
        hasBaseline={false}
        onGoToPipeline={vi.fn()}
        onClose={vi.fn()}
        onRunNow={vi.fn()}
        onLimitSyncDone={vi.fn()}
        onSyncAll={vi.fn()}
      />,
    );

    const filter = screen.getByRole('checkbox', {
      name: /filter by date range/i,
    });
    expect(filter).toBeChecked();
    expect(filter).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: /start limited sync/i }),
    );
    expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
    expect(limitSync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^start date$/i }));
    const calendar = document.querySelector('[data-slot="calendar"]');
    const dateButton = Array.from(
      within(calendar as HTMLElement).getAllByRole('button'),
    ).find(
      (button) =>
        button.hasAttribute('data-day') && !button.hasAttribute('disabled'),
    );
    fireEvent.click(dateButton!);
    fireEvent.click(
      screen.getByRole('button', { name: /start limited sync/i }),
    );
    await waitFor(() =>
      expect(limitSync).toHaveBeenCalledWith(
        'project-1',
        'job-1',
        expect.objectContaining({ limit: 5, startDate: expect.any(String) }),
      ),
    );
  });

  it('leaves the date filter optional for other limited runs', () => {
    render(
      <StartSyncModal
        projectId="project-1"
        jobId="job-1"
        job={{ id: 'job-1', sourceObject: 'jobs', isEnabled: true } as ExtJob}
        sourcePlatformId="servicetitan"
        hasBaseline={false}
        onGoToPipeline={vi.fn()}
        onClose={vi.fn()}
        onRunNow={vi.fn()}
        onLimitSyncDone={vi.fn()}
        onSyncAll={vi.fn()}
      />,
    );
    const filter = screen.getByRole('checkbox', {
      name: /filter by date range/i,
    });
    expect(filter).not.toBeChecked();
    expect(filter).not.toBeDisabled();
    fireEvent.click(filter);
    expect(filter).toBeChecked();
    expect(
      screen.getByRole('button', { name: /^start date$/i }),
    ).toBeInTheDocument();
  });
});
