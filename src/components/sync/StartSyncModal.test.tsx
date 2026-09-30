import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StartSyncModal from './StartSyncModal';

import type { ExtJob } from '@/features/jobs/hooks/useJobDetail';

describe('StartSyncModal', () => {
  afterEach(cleanup);

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
});
