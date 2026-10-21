import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncOperationsApi } from '@/api/syncOperations';
import type { MonitorSnapshot } from '@/types/syncOperations';
import SyncOperationsPage from './SyncOperationsPage';

const mocks = vi.hoisted(() => ({
  snapshot: null as MonitorSnapshot | null,
  fail: false,
  aborts: 0,
}));
vi.mock('@/api/syncOperations', () => ({
  syncOperationsApi: {
    snapshot: vi.fn(() =>
      mocks.fail
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve(mocks.snapshot),
    ),
    detail: vi.fn(() =>
      Promise.resolve({
        generatedAt: new Date().toISOString(),
        data: mocks.snapshot?.data ?? [],
        nextCursor: null,
      }),
    ),
    stream: vi.fn(
      (_id: string, signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            mocks.aborts++;
            resolve();
          });
        }),
    ),
  },
}));

function fixture(): MonitorSnapshot {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    nextCursor: null,
    queue: {
      observedAt: now,
      data: {
        active: 1,
        waiting: 2,
        delayed: 0,
        failed: 1,
        completed: 5,
        workerOnline: true,
      },
    },
    processes: [],
    errors: {},
    data: [
      {
        id: 'run-1',
        syncRunLogId: 'log-1',
        bullJobId: null,
        organisationId: 'org-1',
        organisationName: 'Example organisation',
        projectId: 'project-1',
        projectName: 'CRM',
        jobId: 'job-1',
        jobName: 'Contacts',
        trigger: 'webhook',
        mode: 'webhook',
        status: 'running',
        source: 'HubSpot · contacts',
        destination: 'ServiceTitan · customers',
        startedAt: now,
        finishedAt: null,
        processId: null,
        executionObserved: false,
        progress: {
          observedAt: now,
          source: 'live',
          attempted: 25,
          created: 10,
          updated: 10,
          skipped: 3,
          failed: 2,
          total: 100,
          completedBatches: 0,
          currentBatch: 1,
          batchProcessed: 25,
          batchTotal: 100,
          totalBatches: 1,
          ratePerSec: 5,
        },
      },
    ],
  };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, retryDelay: 1 } },
  });
  const view = render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SyncOperationsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...view, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.snapshot = fixture();
  mocks.fail = false;
  mocks.aborts = 0;
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
});
afterEach(cleanup);

describe('View-only sync operations', () => {
  it('shows two standalone resource cards above the header without merging different process measurements', async () => {
    const now = new Date().toISOString();
    mocks.snapshot!.processes = [
      {
        id: 'worker-a',
        role: 'queue_worker',
        sampledAt: now,
        uptimeSeconds: 120,
        rssMb: 180,
        heapUsedMb: 90,
        cpuCorePercent: 12,
        memoryLimitMb: 1024,
        executions: [{ id: 'run-1', mode: 'full', origin: 'manual' }],
        truncated: false,
      },
      {
        id: 'worker-b',
        role: 'queue_worker',
        sampledAt: new Date(Date.now() - 30000).toISOString(),
        uptimeSeconds: 200,
        rssMb: 95,
        heapUsedMb: 60,
        cpuCorePercent: 150,
        memoryLimitMb: 1024,
        executions: [],
        truncated: false,
      },
      {
        id: 'api-a',
        role: 'api',
        sampledAt: now,
        uptimeSeconds: 300,
        rssMb: 96,
        heapUsedMb: 50,
        cpuCorePercent: 4,
        memoryLimitMb: null,
        executions: [],
        truncated: false,
      },
    ];
    mount();
    const workers = await screen.findByRole('region', { name: 'Sync workers' });
    await within(workers).findByText('2 processes');
    const api = screen.getByRole('region', { name: 'API servers' });
    expect(workers).toHaveTextContent('180');
    expect(workers).toHaveTextContent('95');
    expect(workers).toHaveTextContent('150%');
    expect(within(workers).getByText('Sample outdated')).toBeInTheDocument();
    expect(
      within(workers).getByRole('progressbar', {
        name: 'Memory usage for worker-a',
      }),
    ).toHaveAttribute('aria-valuenow', String((180 / 1024) * 100));
    expect(api).toHaveTextContent('96');
    expect(api).not.toHaveTextContent('180');
    expect(
      within(api).getByText('Container limit unknown'),
    ).toBeInTheDocument();
    expect(within(api).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(workers.parentElement!.closest('[data-slot="card"]')).toBeNull();
    const heading = screen.getByRole('heading', {
      name: 'Platform sync activity',
      level: 1,
    });
    expect(
      workers.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      api.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText('Execution processes')).not.toBeInTheDocument();
  });
  it('does not invent zero resource usage when process samples are unavailable', async () => {
    mount();
    const worker = await screen.findByRole('region', { name: 'Sync workers' });
    await within(worker).findByText('No recent measurements available.');
    expect(within(worker).getByText('Unavailable')).toBeInTheDocument();
    expect(within(worker).queryByText('Memory in use')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'API servers' })).getByText(
        'Unavailable',
      ),
    ).toBeInTheDocument();
  });
  it('does not read or change the tenant progress-card dismissal state', async () => {
    mocks.snapshot!.data[0].status = 'completed';
    localStorage.setItem('synkazo:sync-summary-dismissed:job-1', 'log-1');
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'View details for Contacts' }),
    );
    const card = await screen.findByRole('region', { name: /Sync completed/ });
    expect(card).toHaveAttribute('data-embedded', 'true');
    expect(card.closest('[data-slot="card"]')).toBeNull();
    expect(
      within(card).queryByRole('button', { name: 'Dismiss sync summary' }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem('synkazo:sync-summary-dismissed:job-1')).toBe(
      'log-1',
    );
    localStorage.removeItem('synkazo:sync-summary-dismissed:job-1');
  });
  it('shows organisation-owned activity directly on the page without opening a stream per row', async () => {
    mount();
    expect(await screen.findByText('Example organisation')).toBeInTheDocument();
    expect(screen.getByText('25 / 100 attempted')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Sync runs' });
    expect(
      screen.getByRole('heading', { name: 'Platform sync activity', level: 1 }),
    ).toBeInTheDocument();
    expect(list.closest('[data-slot="card"]')).toBeNull();
    expect(
      screen
        .getByRole('tablist', { name: 'Sync activity view' })
        .closest('[data-slot="card"]'),
    ).toBeNull();
    expect(
      screen.queryByText(
        /refreshes about every|Snapshot |Queue active|Retained failures/,
      ),
    ).not.toBeInTheDocument();
    expect(within(list).getByText('CRM')).toBeInTheDocument();
    expect(within(list).getByText('Organisation:')).toBeInTheDocument();
    expect(within(list).getByText('Project:')).toBeInTheDocument();
    expect(within(list).getByText('Completion')).toBeInTheDocument();
    expect(within(list).getByText('Batches')).toBeInTheDocument();
    expect(within(list).getByText('1 of 1 batches')).toBeInTheDocument();
    expect(within(list).getByText(/HubSpot · contacts/)).toBeInTheDocument();
    expect(
      within(list).getByRole('progressbar', {
        name: 'Overall progress for Contacts',
      }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Current batch|Batch 1/)).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole('heading', { name: 'Contacts' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(syncOperationsApi.stream).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', {
        name: /pause|resume|disable|stop|cancel/i,
      }),
    ).not.toBeInTheDocument();
  });
  it('shows completed runs with skipped or failed records as Partial and keeps internal trigger identifiers out of the presentation', async () => {
    const run = mocks.snapshot!.data[0];
    run.status = 'completed';
    run.trigger = 'manual:1a925122-38ac-471d-b783-7eb51e32ae1c';
    run.progress.attempted = 100;
    run.progress.completedBatches = 1;
    mount();
    const list = await screen.findByRole('list', { name: 'Sync runs' });
    expect(within(list).getByText('Partial')).toBeInTheDocument();
    expect(within(list).getByText('100% complete')).toBeInTheDocument();
    expect(within(list).getByText('Manual')).toBeInTheDocument();
    expect(within(list).getByText('2 failed')).toBeInTheDocument();
    expect(list).not.toHaveTextContent('1a925122');
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });
  it('opens one read-only progress drawer and closes its stream on unmount', async () => {
    const view = mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'View details for Contacts' }),
    );
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(syncOperationsApi.stream).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByRole('link', { name: /Open Sync Flow/ }),
    ).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
    );
    expect(screen.getByText('Live observation')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Current batch progress' }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(
      screen.queryByRole('button', { name: /stop sync/i }),
    ).not.toBeInTheDocument();
    view.unmount();
    expect(mocks.aborts).toBe(1);
  });
  it('suspends queries and streaming in a hidden tab and refreshes on return', async () => {
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'View details for Contacts' }),
    );
    await waitFor(() =>
      expect(syncOperationsApi.stream).toHaveBeenCalledTimes(1),
    );
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    fireEvent(document, new Event('visibilitychange'));
    expect(
      await screen.findByText('Updates suspended while this tab is hidden'),
    ).toBeInTheDocument();
    expect(mocks.aborts).toBe(1);
    expect(screen.getByText('Refresh').closest('button')).toBeDisabled();
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() =>
      expect(syncOperationsApi.stream).toHaveBeenCalledTimes(2),
    );
  });
  it('loads recent outcomes only when selected and preserves the snapshot contract', async () => {
    mount();
    await screen.findByText('Example organisation');
    expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
      expect.any(Object),
      false,
      expect.any(AbortSignal),
    );
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Recent results' }), {
      button: 0,
      ctrlKey: false,
    });
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.any(Object),
        true,
        expect.any(AbortSignal),
      ),
    );
  });
  it('uses the project-directory header and debounces integration search while resetting the cursor', async () => {
    mocks.snapshot!.nextCursor = 'next-page';
    mount();
    await screen.findByText('Example organisation');
    const header = screen
      .getByRole('heading', { name: 'Platform sync activity', level: 1 })
      .closest('header')!;
    expect(
      within(header).getByRole('combobox', { name: 'Run origin' }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole('combobox', { name: 'Sort sync runs' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: 'next-page' }),
        false,
        expect.any(AbortSignal),
      ),
    );
    vi.mocked(syncOperationsApi.snapshot).mockClear();
    const search = within(header).getByRole('textbox', {
      name: 'Search by integration ID',
    });
    fireEvent.change(search, { target: { value: 'hub' } });
    fireEvent.change(search, { target: { value: 'hubspot' } });
    expect(syncOperationsApi.snapshot).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ integration: 'hubspot', cursor: undefined }),
        false,
        expect.any(AbortSignal),
      ),
    );
    expect(syncOperationsApi.snapshot).toHaveBeenCalledTimes(1);
    fireEvent.change(search, { target: { value: 'HubSpot contacts' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use an integration ID',
    );
    fireEvent.click(
      within(header).getByRole('button', { name: 'Clear search' }),
    );
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ integration: undefined, cursor: undefined }),
        false,
        expect.any(AbortSignal),
      ),
    );
  });
  it('applies the API sort and returns to the first page', async () => {
    mocks.snapshot!.nextCursor = 'next-page';
    mount();
    await screen.findByText('Example organisation');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: 'next-page' }),
        false,
        expect.any(AbortSignal),
      ),
    );
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: 'Sort sync runs' }),
      { key: 'ArrowDown' },
    );
    fireEvent.click(
      await screen.findByRole('option', { name: 'Newest first' }),
    );
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'newest', cursor: undefined }),
        false,
        expect.any(AbortSignal),
      ),
    );
  });
  it('shows empty and partial-error states for the visible sections', async () => {
    mocks.snapshot!.data = [];
    mocks.snapshot!.queue = null;
    mocks.snapshot!.errors.processes = 'Process status is unavailable.';
    mount();
    expect(
      await screen.findByText('No syncs are running right now'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Process status is unavailable',
    );
    expect(screen.queryByText('Queue active')).not.toBeInTheDocument();
  });
  it('shows a retryable load failure', async () => {
    mocks.fail = true;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sync activity could not be loaded',
    );
    mocks.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Example organisation')).toBeInTheDocument();
  });
  it('offers recent results from a clear idle state without empty pagination controls', async () => {
    mocks.snapshot!.data = [];
    mount();
    expect(
      await screen.findByText('No syncs are running right now'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/New runs will appear here automatically/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'View recent results' }),
    );
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
        true,
        expect.any(AbortSignal),
      ),
    );
    expect(
      await screen.findByText('No recent sync results'),
    ).toBeInTheDocument();
  });
  it('filters failures server-side in recent results, clears filters and returns to running activity', async () => {
    mocks.snapshot!.data = [];
    mount();
    await screen.findByText('No syncs are running right now');
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Run status' }), {
      key: 'ArrowDown',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Failed' }));
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'failed', cursor: undefined }),
        true,
        expect.any(AbortSignal),
      ),
    );
    expect(
      await screen.findByText('No syncs match these filters'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
        true,
        expect.any(AbortSignal),
      ),
    );
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Active runs' }), {
      button: 0,
      ctrlKey: false,
    });
    await waitFor(() =>
      expect(syncOperationsApi.snapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
        false,
        expect.any(AbortSignal),
      ),
    );
  });
  it('keeps unknown totals and missing measurements honest', async () => {
    mocks.snapshot!.data[0].progress = {
      ...mocks.snapshot!.data[0].progress,
      total: null,
      attempted: null,
      source: 'unavailable',
    };
    mount();
    expect(await screen.findByText('Waiting for progress')).toBeInTheDocument();
    expect(screen.queryByText('0 / 0 attempted')).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', {
        name: 'Overall progress for Contacts',
      }),
    ).not.toHaveAttribute('aria-valuenow');
  });
});
