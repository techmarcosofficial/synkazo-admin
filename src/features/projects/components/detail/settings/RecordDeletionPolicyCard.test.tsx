import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RecordDeletionPolicyCard from './RecordDeletionPolicyCard';

import { projectsApi } from '@/api/projects';
import type { ProjectExt } from '@/features/projects/hooks';

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasPermission: () => true }),
}));

vi.mock('@/api/projects', () => ({
  projectsApi: {
    setRecordDeletionPolicy: vi.fn(),
  },
}));

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const project: ProjectExt = {
  id: 'project-1',
  name: 'Acme integration',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'two_way',
  status: 'active',
  allowRecordDeletionAndDeactivation: false,
};

const setPolicyMock = vi.mocked(projectsApi.setRecordDeletionPolicy);

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecordDeletionPolicyCard', () => {
  it('only turns the policy on after "I UNDERSTAND" is typed', async () => {
    const updated = { ...project, allowRecordDeletionAndDeactivation: true };
    const onUpdated = vi.fn();
    setPolicyMock.mockResolvedValue(updated);

    render(
      <RecordDeletionPolicyCard project={project} onUpdated={onUpdated} />,
    );

    fireEvent.click(
      screen.getByRole('switch', {
        name: 'Allow record deletion and deactivation',
      }),
    );
    const confirmButton = await screen.findByRole('button', {
      name: 'Allow deletion',
    });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText(/to confirm/);
    fireEvent.change(input, { target: { value: 'i understand' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'I UNDERSTAND' } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(setPolicyMock).toHaveBeenCalledWith(
        'project-1',
        true,
        'I UNDERSTAND',
      ),
    );
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it('turns the policy off without asking for confirmation', async () => {
    const enabled = { ...project, allowRecordDeletionAndDeactivation: true };
    setPolicyMock.mockResolvedValue({
      ...enabled,
      allowRecordDeletionAndDeactivation: false,
    });

    render(<RecordDeletionPolicyCard project={enabled} onUpdated={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('switch', {
        name: 'Allow record deletion and deactivation',
      }),
    );

    await waitFor(() =>
      expect(setPolicyMock).toHaveBeenCalledWith('project-1', false, undefined),
    );
    expect(screen.queryByLabelText(/to confirm/)).not.toBeInTheDocument();
  });
});
