import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RunConfirmModal from './RunConfirmModal';

import type { Job } from '@/types';

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getEstimate: vi.fn().mockResolvedValue({
      totalRecords: 10,
      estimatedSeconds: 5,
      ratePerSec: 2,
      countAvailable: true,
    }),
  },
}));

describe('RunConfirmModal - Environment Awareness & Safety Reassurance', () => {
  const defaultJob: Job = {
    id: 'job-1',
    projectId: 'proj-1',
    name: 'Customers Sync',
    sourceObject: 'Customer',
    destObject: 'contact',
    status: 'idle',
    lastSyncedAt: '2026-03-01T12:00:00Z',
  };

  const defaultProps = {
    projectId: 'proj-1',
    jobId: 'job-1',
    job: defaultJob,
    mode: 'runNow' as const,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Sandbox badge and safety reassurance notice in Sandbox mode', () => {
    render(<RunConfirmModal {...defaultProps} environment="sandbox" />);

    expect(screen.getByText('Sandbox (Test Mode)')).toBeInTheDocument();
    expect(screen.getByText(/Operating in Sandbox:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No live production records will be modified/i),
    ).toBeInTheDocument();
  });

  it('renders Production badge and does NOT render sandbox reassurance notice in Production mode', () => {
    render(<RunConfirmModal {...defaultProps} environment="production" />);

    expect(screen.getByText('Production (Live)')).toBeInTheDocument();
    expect(
      screen.queryByText(/Operating in Sandbox:/i),
    ).not.toBeInTheDocument();
  });

  it('calls onConfirm when the confirmation CTA button is clicked', () => {
    render(<RunConfirmModal {...defaultProps} environment="sandbox" />);

    const runButton = screen.getByRole('button', { name: /run now/i });
    fireEvent.click(runButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });
});
