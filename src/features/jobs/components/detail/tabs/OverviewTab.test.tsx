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

    highlightStatusGuide: false,
    triggerInactiveGuide: vi.fn(),
    manualDialogOpen: false,
    setManualDialogOpen: vi.fn(),
    ...overrides,
  };
}

describe('OverviewTab sync prerequisite guidance', () => {
  beforeEach(() => {
    mockContext = buildContext();
  });

  it('triggers the inactive guide when clicking sync on an inactive job without opening dialog', () => {
    render(<OverviewTab />);

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(mockContext.triggerInactiveGuide).toHaveBeenCalledOnce();
    expect(mockContext.setManualDialogOpen).not.toHaveBeenCalled();
    expect(mockContext.handleRunNow).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render duplicate inactive alert inside OverviewTab (single source of truth)', () => {
    render(<OverviewTab />);

    expect(screen.queryByText('Job is inactive')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activate job/i }),
    ).not.toBeInTheDocument();
  });

  it('opens the sync dialog for an active job', () => {
    mockContext = buildContext({
      job: {
        ...buildContext().job,
        isEnabled: true,
      },
    });
    render(<OverviewTab />);

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(mockContext.setManualDialogOpen).toHaveBeenCalledWith(true);
    expect(mockContext.triggerInactiveGuide).not.toHaveBeenCalled();
  });

  it('renders StartSyncModal when manualDialogOpen is true', () => {
    mockContext = buildContext({
      manualDialogOpen: true,
    });
    render(<OverviewTab />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders run queued alert when a run is queued', () => {
    mockContext = buildContext({
      runLogs: [{ id: 'run-1', status: 'queued', bullmqJobId: 'bull-1' } as JobDetailContextValue['runLogs'][number]],
    });
    render(<OverviewTab />);

    expect(screen.getByText('Run queued')).toBeInTheDocument();
  });
});
