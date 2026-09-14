import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MigrationPanel from './MigrationPanel';

import type { MigrationDiff, MigrationRun } from '@/api/migration';

const api = vi.hoisted(() => ({
  diff: vi.fn(),
  run: vi.fn(),
  listRuns: vi.fn(),
  getRunItems: vi.fn(),
}));
const auth = vi.hoisted(() => ({ canManage: true }));

vi.mock('@/api/migration', () => ({ migrationApi: api }));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => auth.canManage }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const comparison: MigrationDiff = {
  from: 'sandbox',
  to: 'production',
  ready: true,
  sandboxConnected: true,
  productionConnected: true,
  customObjects: [
    {
      identityKey: 'object:contractors',
      kind: 'custom_object',
      displayName: 'Contractors',
      status: 'missing',
    },
  ],
  properties: [
    {
      identityKey: 'property:contacts:tier',
      kind: 'property',
      displayName: 'Customer tier',
      objectType: 'contacts',
      status: 'missing',
    },
    {
      identityKey: 'property:contacts:email',
      kind: 'property',
      displayName: 'Email',
      objectType: 'contacts',
      status: 'in_sync',
    },
  ],
  associations: [
    {
      identityKey: 'association:contractor:company',
      kind: 'association',
      displayName: 'Works for',
      status: 'conflict',
      conflictReason: 'The target label uses a different internal type.',
    },
  ],
};

const completedRun: MigrationRun = {
  id: 'run-1',
  projectId: 'project-1',
  status: 'partial',
  fromEnvironment: 'sandbox',
  toEnvironment: 'production',
  totalItems: 2,
  succeeded: 1,
  skipped: 1,
  failed: 0,
  startedAt: '2026-09-08T10:00:00.000Z',
  createdAt: '2026-09-08T10:00:00.000Z',
  completedAt: '2026-09-08T10:00:01.000Z',
};

beforeEach(() => {
  api.diff.mockResolvedValue(comparison);
  api.listRuns.mockResolvedValue([]);
  api.run.mockResolvedValue(completedRun);
  api.getRunItems.mockResolvedValue([]);
  auth.canManage = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel(onGoToConnections = vi.fn()) {
  render(
    <MigrationPanel
      projectId="project-1"
      connections={[]}
      onGoToConnections={onGoToConnections}
    />,
  );
  return onGoToConnections;
}

describe('MigrationPanel', () => {
  it('compares, filters, confirms, and reports a safe partial transfer', async () => {
    renderPanel();

    expect(
      await screen.findByText('Compare configuration'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Conflicts (1)' }));
    expect(
      screen.getByText('The target label uses a different internal type.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Available (2)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Conflicts (1)' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Available (2)' }));

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Customer tier' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Transfer to Production' }),
    );

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(
        /items that appear during the run or already exist/i,
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Transfer to Production' }),
    );

    await waitFor(() =>
      expect(api.run).toHaveBeenCalledWith(
        'project-1',
        ['property:contacts:tier'],
        'sandbox',
        'production',
      ),
    );
    expect(await screen.findByText('Transfer finished')).toBeInTheDocument();
    expect(screen.getAllByText('1 skipped')).not.toHaveLength(0);
  });

  it('supports Production to Sandbox comparison and transfer direction', async () => {
    renderPanel();
    await screen.findByText('Compare configuration');

    await userEvent.click(
      screen.getByRole('button', { name: /reverse direction/i }),
    );

    await waitFor(() =>
      expect(api.diff).toHaveBeenLastCalledWith(
        'project-1',
        'production',
        'sandbox',
      ),
    );
    expect(
      screen.getByText('Read configuration').previousSibling,
    ).toHaveTextContent('Production');
  });

  it('shows connection prerequisites and routes to connection setup', async () => {
    api.diff.mockResolvedValue({
      ...comparison,
      ready: false,
      productionConnected: false,
      message: 'Production HubSpot connection is not connected.',
      customObjects: [],
      properties: [],
      associations: [],
    });
    const onGoToConnections = renderPanel();

    expect(
      await screen.findByText('Connect both environments'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Configure connections' }),
    );
    expect(onGoToConnections).toHaveBeenCalledOnce();
  });

  it('keeps comparison failures visible and retryable', async () => {
    api.diff
      .mockRejectedValueOnce(new Error('HubSpot schema request timed out.'))
      .mockResolvedValueOnce(comparison);
    renderPanel();

    expect(
      await screen.findByText('Comparison unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('HubSpot schema request timed out.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Custom objects')).toBeInTheDocument();
  });

  it('shows an accurate in-sync state when no items are missing', async () => {
    api.diff.mockResolvedValue({
      ...comparison,
      customObjects: [],
      properties: comparison.properties.filter(
        (item) => item.status === 'in_sync',
      ),
      associations: [],
    });
    renderPanel();

    expect(
      await screen.findByText('Environments are in sync'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/every comparable Sandbox item/i),
    ).toBeInTheDocument();
  });

  it('keeps comparison and history read-only for editors', async () => {
    auth.canManage = false;
    renderPanel();

    expect(
      await screen.findByText('Admin access required to transfer'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Select Customer tier' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Transfer to Production' }),
    ).not.toBeInTheDocument();
  });

  it('preserves the selection and exposes a persistent transfer failure', async () => {
    api.run.mockRejectedValue(new Error('Target rate limit reached.'));
    renderPanel();
    await screen.findByText('Compare configuration');

    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Customer tier',
    });
    await userEvent.click(checkbox);
    await userEvent.click(
      screen.getByRole('button', { name: 'Transfer to Production' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Transfer to Production',
      }),
    );

    expect(await screen.findByText('Transfer failed')).toBeInTheDocument();
    expect(screen.getAllByText(/Target rate limit reached/)).not.toHaveLength(
      0,
    );
    expect(checkbox).toBeChecked();
  });
});
