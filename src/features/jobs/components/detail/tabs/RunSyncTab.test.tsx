import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobDetailContextValue } from '../context';
import RunSyncTab from './RunSyncTab';

let mockContext: Partial<JobDetailContextValue>;
let canRun = true;

afterEach(() => cleanup());

vi.mock('../context', () => ({
  useJobDetailContext: () => mockContext,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasPermission: (permission: string) =>
      permission === 'job.run' ? canRun : true,
  }),
}));

vi.mock('@/components/shared/StatusBadge', () => ({
  default: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock('@/components/sync/StartSyncModal', () => ({
  default: ({
    embedded,
    disabled,
    onClose,
  }: {
    embedded?: boolean;
    disabled?: boolean;
    onClose: () => void;
  }) => (
    <div
      data-testid="run-workflow"
      data-embedded={String(embedded)}
      data-disabled={String(disabled)}
    >
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const configuredMapping = {
  sourceField: 'email',
  destField: 'email',
  matchDestKey: 'email',
} as JobDetailContextValue['jobFieldMappings'][number];

function buildContext(
  overrides: Partial<JobDetailContextValue> = {},
): Partial<JobDetailContextValue> {
  return {
    projectId: 'project-1',
    job: {
      id: 'job-1',
      name: 'Contacts',
      isEnabled: false,
      syncDirection: 'one_way',
    } as JobDetailContextValue['job'],
    project: {
      id: 'project-1',
      status: 'active',
      active_environment: 'sandbox',
    } as JobDetailContextValue['project'],
    runLogs: [],
    jobFieldMappings: [configuredMapping],
    hasConnection: true,
    pipelineRequired: false,
    pipelineConfigured: true,
    isSyncing: false,
    refetch: vi.fn(),
    beginTracking: vi.fn(),
    handleRunNow: vi.fn(),
    handleSyncAll: vi.fn(),
    handleTabChange: vi.fn(),
    ...overrides,
  };
}

describe('RunSyncTab', () => {
  beforeEach(() => {
    canRun = true;
    mockContext = buildContext();
  });

  it('shows the manual run workflow inline, ready to run', () => {
    render(<RunSyncTab />);

    expect(screen.getByRole('heading', { name: 'Run Sync' })).toBeVisible();
    expect(screen.getByText('Sandbox')).toBeInTheDocument();
    const workflow = screen.getByTestId('run-workflow');
    expect(workflow).toHaveAttribute('data-embedded', 'true');
    expect(workflow).toHaveAttribute('data-disabled', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains why a run cannot start', () => {
    mockContext = buildContext({
      runLogs: [
        { id: 'run-1', status: 'queued' },
      ] as JobDetailContextValue['runLogs'],
    });
    render(<RunSyncTab />);

    expect(screen.getByRole('status')).toHaveTextContent(/A run is queued/);
    expect(screen.getByTestId('run-workflow')).toHaveAttribute(
      'data-disabled',
      'true',
    );
  });

  it('asks for field mapping first when nothing is mapped', () => {
    mockContext = buildContext({ jobFieldMappings: [] });
    render(<RunSyncTab />);

    expect(screen.getByRole('status')).toHaveTextContent(/Field Mapping/);
  });

  it('hides the workflow without run permission', () => {
    canRun = false;
    render(<RunSyncTab />);

    expect(screen.getByRole('status')).toHaveTextContent(/permission/);
    expect(screen.queryByTestId('run-workflow')).not.toBeInTheDocument();
  });

  it('returns to Overview when the workflow is closed', () => {
    render(<RunSyncTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockContext.handleTabChange).toHaveBeenCalledWith('overview');
  });
});
