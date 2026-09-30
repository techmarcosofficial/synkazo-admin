import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectDetailContext } from '../context';
import OverviewTab from './OverviewTab';

vi.mock('../context', () => ({
  useProjectDetailContext: vi.fn(),
}));

vi.mock('../overview/ProjectKeyMetrics', () => ({
  default: () => <div data-testid="project-key-metrics" />,
}));

vi.mock('../overview/ProjectRecentActivity', () => ({
  default: () => <div data-testid="project-recent-activity" />,
}));

vi.mock('../overview/ProjectUpcomingEvents', () => ({
  default: () => <div data-testid="project-upcoming-events" />,
}));

vi.mock('@/features/journey', () => ({
  DraftResumptionBanner: () => null,
}));

describe('Project OverviewTab - Environment Awareness & Production Promotion', () => {
  const mockHandleTabChange = vi.fn();
  const mockOnCreateSyncRule = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders "Connect your Production platforms" when graduated in Sandbox and Production is disconnected', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'HubSpot Sync' } as any,
      jobs: [
        {
          id: 'job-1',
          status: 'active',
          isEnabled: true,
          lastSyncedAt: '2026-03-01T12:00:00Z',
        } as any,
      ],
      logs: [],
      hasBothConnections: true,
      projectActiveEnv: 'sandbox',
      envFullyConnected: vi.fn((env) => env === 'sandbox'),
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(<OverviewTab />);

    expect(screen.getByText('Sandbox Testing Complete')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /ready to go live\? connect your production platforms/i,
      }),
    ).toBeInTheDocument();

    const connectButton = screen.getByRole('button', {
      name: /^connect production platforms/i,
    });
    expect(connectButton).toBeInTheDocument();

    fireEvent.click(connectButton);
    expect(mockHandleTabChange).toHaveBeenCalledWith('connections', {
      env: 'production',
    });
  });

  it('renders "Promote to Production" when graduated in Sandbox and Production is fully connected', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'HubSpot Sync' } as any,
      jobs: [
        {
          id: 'job-1',
          status: 'active',
          isEnabled: true,
          lastSyncedAt: '2026-03-01T12:00:00Z',
        } as any,
      ],
      logs: [],
      hasBothConnections: true,
      projectActiveEnv: 'sandbox',
      envFullyConnected: vi.fn((env) => env === 'production' || env === 'sandbox'),
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(<OverviewTab />);

    expect(screen.getByText('Production Ready')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /ready to activate live production sync\?/i,
      }),
    ).toBeInTheDocument();

    const promoteButton = screen.getByRole('button', {
      name: /^promote to production/i,
    });
    expect(promoteButton).toBeInTheDocument();

    fireEvent.click(promoteButton);
    expect(mockHandleTabChange).toHaveBeenCalledWith('settings', {
      section: 'environments',
    });
  });

  it('does NOT render promotion card when active environment is production', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      project: { id: 'proj-1', name: 'HubSpot Sync' } as any,
      jobs: [
        {
          id: 'job-1',
          status: 'active',
          isEnabled: true,
          lastSyncedAt: '2026-03-01T12:00:00Z',
        } as any,
      ],
      logs: [],
      hasBothConnections: true,
      projectActiveEnv: 'production',
      envFullyConnected: vi.fn(() => true),
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(<OverviewTab />);

    expect(
      screen.queryByText('Sandbox Testing Complete'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Production Ready')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        level: 3,
        name: /ready/i,
      }),
    ).not.toBeInTheDocument();
  });
});
