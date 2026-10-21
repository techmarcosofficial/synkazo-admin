import { useState, type ReactNode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncRun } from '@/types';
import LimitSyncModal from './LimitSyncModal';

const mocks = vi.hoisted(() => ({
  status: 'completed' as SyncRun['status'],
  close: vi.fn(),
}));
vi.mock('@/api/jobs', () => ({
  jobsApi: {
    toggleJob: vi.fn().mockResolvedValue(undefined),
    limitSync: vi.fn().mockResolvedValue(undefined),
    stopJob: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/api/syncLogs', () => ({
  syncLogsApi: {
    listRunLogs: vi.fn(async () => {
      const run: SyncRun = {
        id: 'run-1',
        jobId: 'job-1',
        status: mocks.status,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        createdCount: mocks.status === 'completed' ? 5 : 0,
        failedCount: mocks.status === 'failed' ? 1 : 0,
        totalFetched: 5,
        totalPages: 1,
      };
      return { data: [run] };
    }),
  },
}));
vi.mock('@/lib/sseClient', () => ({
  sseClient: { on: vi.fn(() => () => undefined) },
}));
vi.mock('@/components/shared/UpgradeRequiredDialog', () => ({
  default: () => null,
}));

function ManualRun() {
  const [footer, setFooter] = useState<ReactNode>(null);
  return (
    <>
      <LimitSyncModal
        embedded
        compact
        projectId="project-1"
        jobId="job-1"
        onClose={mocks.close}
        onFooterChange={setFooter}
      />
      <div role="group" aria-label="Manual run actions">
        {footer}
      </div>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.status = 'completed';
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Manual run progress', () => {
  it.each(['completed', 'success'] as const)(
    'shows progress directly in its parent and Done after %s',
    async (status) => {
      mocks.status = status;
      localStorage.setItem('synkazo:sync-summary-dismissed:job-1', 'run-1');
      render(<ManualRun />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Activate & Start Sync' }),
      );
      const done = await screen.findByRole(
        'button',
        { name: 'Done' },
        { timeout: 2000 },
      );
      const summary = screen.getByRole('region', { name: 'Sync completed' });
      expect(summary.closest('[data-slot="card"]')).toBeNull();
      expect(
        within(summary).queryByRole('button', { name: 'Dismiss sync summary' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Close' }),
      ).not.toBeInTheDocument();
      fireEvent.click(done);
      expect(mocks.close).toHaveBeenCalledOnce();
      expect(localStorage.getItem('synkazo:sync-summary-dismissed:job-1')).toBe(
        'run-1',
      );
    },
  );
  it('keeps unsuccessful progress visible and offers a return to Overview', async () => {
    mocks.status = 'failed';
    render(<ManualRun />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Activate & Start Sync' }),
    );
    expect(
      await screen.findByRole(
        'region',
        { name: 'Sync failed' },
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Done' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }));
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
