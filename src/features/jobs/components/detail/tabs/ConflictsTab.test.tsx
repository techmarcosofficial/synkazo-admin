import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConflictsTab from './ConflictsTab';

import type { SyncConflict } from '@/types';

const mutateAsync = vi.fn();
let items: SyncConflict[] = [];

vi.mock('../context', () => ({
  useJobDetailContext: () => ({ projectId: 'project-1', job: { id: 'job-1' } }),
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasPermission: () => true }),
}));

vi.mock('@/lib/toast', () => ({
  showToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/queries/useJobs', () => ({
  useJobConflictsQuery: () => ({
    data: { items, total: items.length, page: 1, limit: 25 },
    isError: false,
    refetch: vi.fn(),
  }),
  useConflictActionMutation: () => ({ mutateAsync }),
}));

const base = {
  projectId: 'project-1',
  jobId: 'job-1',
  resolvedBy: 'system' as const,
  createdAt: '2026-11-01T10:00:00Z',
  resolvedAt: null,
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ success: true });
});

describe('ConflictsTab', () => {
  it('shows a missing-parent record and triggers the parent sync', async () => {
    items = [
      {
        ...base,
        id: 'c-1',
        fieldName: 'customerId',
        sourceValue: 'hs-9',
        destValue: null,
        resolvedValue: null,
        resolutionStrategy: 'manual_review',
        status: 'pending_review',
        errorCode: 'MISSING_PARENT_MAPPING',
        recordId: 'hs-deal-5',
        direction: 'b_to_a',
        parentObject: 'customers',
        parentRecordId: 'hs-9',
      },
    ];
    render(<ConflictsTab />);

    expect(screen.getByText('Missing parent record')).toBeInTheDocument();
    expect(screen.getByText('hs-deal-5')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /trigger parent object sync/i }),
    );
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        action: 'triggerParentSync',
        conflictId: 'c-1',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /retry record/i }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        action: 'retryRecord',
        conflictId: 'c-1',
      }),
    );
  });

  it('shows both values and the kept one for a field conflict', () => {
    items = [
      {
        ...base,
        id: 'c-2',
        fieldName: 'phone',
        sourceValue: '555-0100',
        destValue: '555-0199',
        resolvedValue: '555-0199',
        resolutionStrategy: 'most_recently_modified_wins',
        status: 'auto_resolved',
      },
    ];
    render(<ConflictsTab />);

    expect(screen.getByText('Most recent change won')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getAllByText('555-0199')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /mark resolved/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no conflicts', () => {
    items = [];
    render(<ConflictsTab />);
    expect(screen.getByText('No conflicts yet')).toBeInTheDocument();
  });
});
