import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AssociationRunsList from './AssociationRunsList';

import { associationsApi } from '@/api/associations';
import type { AssociationRecord, AssociationRunLog } from '@/api/associations';

vi.mock('@/api/associations', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/associations')>(
      '@/api/associations',
    );
  return {
    ...actual,
    associationsApi: {
      ...actual.associationsApi,
      getProjectRuns: vi.fn(),
      getRuleRecords: vi.fn(),
    },
  };
});

const getProjectRuns = vi.mocked(associationsApi.getProjectRuns);
const getRuleRecords = vi.mocked(associationsApi.getRuleRecords);

const run: AssociationRunLog = {
  id: 'run-1',
  associationRuleId: 'rule-1',
  status: 'completed',
  startedAt: '2026-09-15T03:45:00.000Z',
  completedAt: '2026-09-15T03:45:10.000Z',
  triggeredBy: 'scheduler',
  totalAttempted: 206,
  succeeded: 200,
  pendingCreated: 4,
  failed: 2,
  associationRule: {
    id: 'rule-1',
    projectId: 'project-1',
    name: 'Associate contacts with companies using company domain',
    sourceObject: 'contacts',
    sourceMatchField: 'company_domain',
    targetObject: 'companies',
    targetMatchField: 'domain',
    associationType: 'primary',
  },
};

const record: AssociationRecord = {
  id: 'record-1',
  associationRuleId: 'rule-1',
  sourceId: '504388844',
  sourceHsId: '587803681546',
  targetMatchValue: 'acme.test',
  targetId: 'company-1',
  targetHsId: '503816932',
  status: 'completed',
  retryCount: 0,
  lastAttemptedAt: '2026-09-15T03:45:08.000Z',
  errorMessage: null,
  createdAt: '2026-09-15T03:45:01.000Z',
};

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AssociationRunsList projectId="project-1" />
    </QueryClientProvider>,
  );
}

describe('AssociationRunsList', () => {
  beforeEach(() => {
    getProjectRuns.mockResolvedValue({
      success: true,
      data: [run],
      total: 1,
      page: 1,
      limit: 10,
    });
    getRuleRecords.mockResolvedValue({
      success: true,
      data: [record],
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('groups record details under their parent run', async () => {
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByText('#run-1')).toBeInTheDocument();
    expect(screen.getByText('206')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /#run-1/ }));

    expect(screen.getByText('Record Details')).toBeInTheDocument();
    expect(screen.queryByText('Association Details')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Associated Records \(200\)/ }),
    );
    expect(await screen.findByText('504388844')).toBeInTheDocument();
    expect(screen.getByText('503816932')).toBeInTheDocument();

    await waitFor(() => {
      expect(getRuleRecords).toHaveBeenCalledWith(
        'project-1',
        'rule-1',
        expect.objectContaining({ runId: 'run-1', status: 'completed' }),
      );
    });
  });

  it('applies an expanded result group to the current run only', async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByText('#run-1');
    await user.click(screen.getByRole('button', { name: /#run-1/ }));
    await screen.findByText('Record Details');
    await user.click(
      screen.getByRole('button', { name: /Failed Records \(2\)/ }),
    );

    await waitFor(() => {
      expect(getRuleRecords).toHaveBeenLastCalledWith(
        'project-1',
        'rule-1',
        expect.objectContaining({ runId: 'run-1', status: 'failed' }),
      );
    });
  });
});
