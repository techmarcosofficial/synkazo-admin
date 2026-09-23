import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobDetailContextValue } from '../context';
import OverviewTab from './OverviewTab';

let mockContext: JobDetailContextValue;

afterEach(() => cleanup());

vi.mock('../context', () => ({
  useJobDetailContext: () => mockContext,
}));

vi.mock('@/queries/usePriorityQueue', () => ({
  usePriorityQueueQuery: () => ({ data: undefined }),
}));

vi.mock('@/components/shared/StatusBadge', () => ({
  default: () => <span data-testid="status-badge" />,
}));

vi.mock('@/components/shared/UpgradeRequiredDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/sync/SyncRunProgress', () => ({
  default: () => null,
}));

vi.mock('@/components/sync/StartSyncModal', () => ({
  default: ({ disabled }: { disabled: boolean }) => (
    <div role="dialog" data-disabled={disabled}>
      Start sync
    </div>
  ),
}));

const activeProject = {
  id: 'project-1',
  name: 'Project',
  status: 'active',
} as JobDetailContextValue['project'];

const configuredMapping = {
  sourceField: 'email',
  destField: 'email',
  matchDestKey: 'email',
} as JobDetailContextValue['jobFieldMappings'][number];

function buildContext(
  overrides: Partial<JobDetailContextValue> = {},
): JobDetailContextValue {
  return {
    projectId: 'project-1',
    jobId: 'job-1',
    job: {
      id: 'job-1',
      name: 'Contacts',
      isEnabled: false,
      syncEnabled: false,
      status: 'idle',
      syncDirection: 'one_way',
      recordsSynced: 0,
      errorCount: 0,
    } as JobDetailContextValue['job'],
    project: activeProject,
    runLogs: [],
    jobFieldMappings: [configuredMapping],
    hasConnection: true,
    pipelineRequired: false,
    pipelineConfigured: true,
    activeTab: 'overview',
    patchJob: vi.fn(),
    refetch: vi.fn(),
    handleTabChange: vi.fn(),
    activeRunLog: null,
    liveProgress: null,
    upgradeDialog: { open: false, message: '' },
    setUpgradeDialog: vi.fn(),
    isSyncing: false,
    running: false,
    fullResyncing: false,
    stopping: false,
    toggling: false,
    scheduleToggling: false,
    cancellingQueue: false,
    retryingQueue: false,
    beginTracking: vi.fn().mockResolvedValue(undefined),

    handleRunNow: vi.fn().mockResolvedValue(undefined),
    handleSyncAll: vi.fn().mockResolvedValue(undefined),
    handleScheduleToggle: vi.fn().mockResolvedValue(undefined),
    handleStop: vi.fn().mockResolvedValue(undefined),
    handleCancelQueue: vi.fn().mockResolvedValue(undefined),
    handleRetryQueue: vi.fn().mockResolvedValue(undefined),
    handleToggle: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function getInactiveNotification(): HTMLElement {
  return screen
    .getByText('Job is inactive')
    .closest<HTMLElement>('[role="alert"]')!;
}

describe('OverviewTab sync prerequisite guidance', () => {
  beforeEach(() => {
    mockContext = buildContext();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('focuses and highlights the visible inactive notification without opening sync', () => {
    render(<OverviewTab />);

    const notification = getInactiveNotification();
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(notification).toHaveFocus();
    expect(notification).toHaveClass('ring-2');
    expect(notification.scrollIntoView).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockContext.handleRunNow).not.toHaveBeenCalled();
  });

  it('scrolls an inactive notification into view when it is below the viewport', () => {
    render(<OverviewTab />);

    const notification = getInactiveNotification();
    vi.spyOn(notification, 'getBoundingClientRect').mockReturnValue({
      top: 900,
      bottom: 980,
      left: 0,
      right: 600,
      width: 600,
      height: 80,
      x: 0,
      y: 900,
      toJSON: () => ({}),
    });

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(notification.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
    });
    expect(notification).toHaveFocus();
  });

  it('restarts guidance on repeated blocked clicks without starting a sync', () => {
    render(<OverviewTab />);

    const syncNow = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncNow);
    fireEvent.click(syncNow);

    expect(getInactiveNotification()).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockContext.handleRunNow).not.toHaveBeenCalled();
  });

  it('opens the existing sync dialog normally for an active job', () => {
    mockContext = buildContext({
      job: {
        ...buildContext().job,
        isEnabled: true,
      },
    });
    render(<OverviewTab />);

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Job is inactive')).not.toBeInTheDocument();
  });

  it('keeps an incomplete inactive notification informational', () => {
    mockContext = buildContext({
      jobFieldMappings: [],
      hasConnection: false,
    });
    render(<OverviewTab />);

    expect(
      screen.getByText(/complete the required setup before activating/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activate job/i }),
    ).not.toBeInTheDocument();
  });

  it('offers activation when configuration is complete and preserves failure state', async () => {
    const handleToggle = vi.fn().mockResolvedValue(undefined);
    mockContext = buildContext({ handleToggle });
    render(<OverviewTab />);

    fireEvent.click(screen.getByRole('button', { name: /activate job/i }));

    await waitFor(() => expect(handleToggle).toHaveBeenCalledOnce());
    expect(getInactiveNotification()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeEnabled();
  });

  it('returns to normal sync behavior after activation succeeds', async () => {
    const handleToggle = vi.fn().mockResolvedValue(undefined);
    mockContext = buildContext({ handleToggle });
    const { rerender } = render(<OverviewTab />);

    fireEvent.click(screen.getByRole('button', { name: /activate job/i }));
    await waitFor(() => expect(handleToggle).toHaveBeenCalledOnce());

    mockContext = {
      ...mockContext,
      job: { ...mockContext.job, isEnabled: true },
    };
    rerender(<OverviewTab />);
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
