import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GeneralSettingsCard from './GeneralSettingsCard';

import { projectsApi } from '@/api/projects';
import type { ProjectExt } from '@/features/projects/hooks';
import { showToast } from '@/lib/toast';

vi.mock('@/api/projects', () => ({
  projectsApi: {
    updateProject: vi.fn(),
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
  description: 'Original description',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  status: 'active',
};

const updateProjectMock = vi.mocked(projectsApi.updateProject);

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GeneralSettingsCard', () => {
  it('updates only editable project information', async () => {
    const updated = { ...project, name: 'Acme production integration' };
    const onUpdated = vi.fn();
    updateProjectMock.mockResolvedValue(updated);

    render(<GeneralSettingsCard project={project} onUpdated={onUpdated} />);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.queryByText('Integration platforms')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: 'Acme production integration' },
    });
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProjectMock).toHaveBeenCalledWith('project-1', {
        name: 'Acme production integration',
        description: 'Original description',
      });
    });
    expect(onUpdated).toHaveBeenCalledWith(updated);
    expect(showToast.success).toHaveBeenCalledWith('Project updated.');
  });

  it('keeps an API failure visible so the user can retry', async () => {
    updateProjectMock.mockRejectedValue(new Error('Request failed'));

    render(<GeneralSettingsCard project={project} onUpdated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: 'Acme retry integration' },
    });
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    expect(
      await screen.findByText(
        'Your changes could not be saved. Please try again.',
      ),
    ).toBeInTheDocument();
    expect(showToast.error).toHaveBeenCalledWith(
      'Something went wrong. Please try again.',
    );
    expect(saveButton).toBeEnabled();
  });
});
