import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecentRunsList, RuleRecordsList } from './AssociationRulesList';

import { associationsApi } from '@/api/associations';
import type { AssociationRecord } from '@/api/associations';
import type { PaginatedResponse } from '@/types';

vi.mock('@/api/associations', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/associations')>(
      '@/api/associations',
    );
  return {
    ...actual,
    associationsApi: {
      ...actual.associationsApi,
      getRuleRecords: vi.fn(),
      getRunLogs: vi.fn(),
    },
  };
});

const getRuleRecords = vi.mocked(associationsApi.getRuleRecords);
const getRunLogs = vi.mocked(associationsApi.getRunLogs);

function makeRecord(overrides: Partial<AssociationRecord>): AssociationRecord {
  return {
    id: overrides.id ?? 'rec-1',
    associationRuleId: 'rule-1',
    sourceId: 'src-1',
    sourceHsId: 'hs-1',
    targetMatchValue: 'target-1',
    targetId: null,
    targetHsId: null,
    status: 'pending',
    retryCount: 0,
    lastAttemptedAt: null,
    errorMessage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function recordsPage(
  items: AssociationRecord[],
  total: number,
  page = 1,
  limit = 10,
): PaginatedResponse<AssociationRecord> {
  return { success: true, data: items, total, page, limit };
}

function lastRecordsCallParams() {
  const calls = getRuleRecords.mock.calls;
  return calls[calls.length - 1]?.[2];
}

afterEach(() => {
  cleanup();
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('RuleRecordsList', () => {
  beforeEach(() => {
    getRuleRecords.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first page of records', async () => {
    getRuleRecords.mockResolvedValue(
      recordsPage([makeRecord({ id: 'r1', sourceId: 'page1-record' })], 25),
    );

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);

    expect(await screen.findByText('page1-record')).toBeInTheDocument();
    expect(screen.getByText(/25 records/)).toBeInTheDocument();
    const [, , params] = getRuleRecords.mock.calls[0];
    expect(params).toMatchObject({ page: 1, limit: 10, status: 'all' });
  });

  it('updates the displayed records when the page changes', async () => {
    getRuleRecords.mockImplementation(async (_p, _r, params) =>
      recordsPage(
        [
          makeRecord({
            id: `r-${params?.page}`,
            sourceId: `page${params?.page}-record`,
          }),
        ],
        25,
        params?.page,
      ),
    );

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);
    expect(await screen.findByText('page1-record')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('page2-record')).toBeInTheDocument();
    expect(screen.queryByText('page1-record')).not.toBeInTheDocument();
  });

  it('preserves the search value while changing pages', async () => {
    getRuleRecords.mockResolvedValue(recordsPage([makeRecord({})], 25));

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);
    await screen.findByText(/25 records/);

    const searchInput = screen.getByPlaceholderText('Search records…');
    await userEvent.type(searchInput, 'acme');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => {
      expect(lastRecordsCallParams()).toMatchObject({
        page: 2,
        search: 'acme',
      });
    });
    expect(searchInput).toHaveValue('acme');
  });

  it('resets to page 1 when the status filter changes', async () => {
    getRuleRecords.mockResolvedValue(recordsPage([makeRecord({})], 25));

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);
    await screen.findByText(/25 records/);

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(lastRecordsCallParams()).toMatchObject({ page: 2 }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Pending' }));

    await waitFor(() =>
      expect(lastRecordsCallParams()).toMatchObject({
        page: 1,
        status: 'pending',
      }),
    );
  });

  it('starts at page 1 again when mounted for a different rule', async () => {
    getRuleRecords.mockResolvedValue(recordsPage([makeRecord({})], 25));

    const { unmount } = renderWithClient(
      <RuleRecordsList projectId="p1" ruleId="rule-a" />,
    );
    await screen.findByText(/25 records/);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(lastRecordsCallParams()).toMatchObject({ page: 2 }),
    );
    unmount();

    getRuleRecords.mockClear();
    getRuleRecords.mockResolvedValue(recordsPage([makeRecord({})], 5));
    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-b" />);

    await waitFor(() =>
      expect(lastRecordsCallParams()).toMatchObject({ page: 1 }),
    );
  });

  it('shows an empty state when the filter matches no records', async () => {
    getRuleRecords.mockResolvedValue(recordsPage([], 0));

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);

    expect(
      await screen.findByText('No records in this filter'),
    ).toBeInTheDocument();
  });

  it('shows loading skeletons before data arrives, then swaps to real rows', async () => {
    let resolveFn!: (value: PaginatedResponse<AssociationRecord>) => void;
    getRuleRecords.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );

    const { container } = renderWithClient(
      <RuleRecordsList projectId="p1" ruleId="rule-1" />,
    );

    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);

    await act(async () => {
      resolveFn(recordsPage([makeRecord({ sourceId: 'loaded-record' })], 1));
    });

    expect(await screen.findByText('loaded-record')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
  });

  it('renders a long error message without overlapping the status badge', async () => {
    const longMessage =
      'Target record not found in HubSpot — this is a deliberately long pending reason used to verify wrapping behavior does not overlap the status badge next to it.';
    getRuleRecords.mockResolvedValue(
      recordsPage(
        [makeRecord({ status: 'pending', errorMessage: longMessage })],
        1,
      ),
    );

    const { container } = renderWithClient(
      <RuleRecordsList projectId="p1" ruleId="rule-1" />,
    );

    const errorEl = await screen.findByText(longMessage);
    expect(errorEl.className).toContain('break-words');
    expect(errorEl.className).not.toContain('truncate');
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).toHaveTextContent('Pending');
  });

  it('renders pagination controls with wrap-friendly, disableable layout', async () => {
    getRuleRecords.mockResolvedValue(recordsPage([makeRecord({})], 25));

    renderWithClient(<RuleRecordsList projectId="p1" ruleId="rule-1" />);

    const showing = await screen.findByText(/Showing 1–10 of 25/);
    const bar = showing.parentElement;
    expect(bar?.className).toContain('flex-wrap');

    const nextButton = screen.getByRole('button', { name: 'Next page' });
    expect(nextButton).not.toBeDisabled();
  });
});

describe('RecentRunsList', () => {
  beforeEach(() => {
    getRunLogs.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no runs', async () => {
    getRunLogs.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    renderWithClient(<RecentRunsList projectId="p1" ruleId="rule-1" />);

    expect(
      await screen.findByText('No runs yet — click Run Now to start.'),
    ).toBeInTheDocument();
  });

  it('shows the capped list with the real total when there are many runs', async () => {
    const logs = Array.from({ length: 10 }).map((_, i) => ({
      id: `log-${i}`,
      status: 'completed',
      startedAt: '2026-01-01T00:00:00.000Z',
      triggeredBy: 'manual',
      succeeded: 5,
      failed: 0,
      pendingCreated: 0,
    }));
    getRunLogs.mockResolvedValue({ success: true, data: logs, total: 37 });

    renderWithClient(<RecentRunsList projectId="p1" ruleId="rule-1" />);

    expect(
      await screen.findByText('Showing 10 of 37 runs'),
    ).toBeInTheDocument();
    const rows = screen.getAllByText('5');
    expect(rows.length).toBe(10);
  });
});

describe('layout: no overlap between record status and metadata (regression guard)', () => {
  it('keeps the status badge and source/target values in separate elements', async () => {
    getRuleRecords.mockResolvedValue(
      recordsPage(
        [makeRecord({ status: 'completed', sourceId: 'row-check' })],
        1,
      ),
    );

    const { container } = renderWithClient(
      <RuleRecordsList projectId="p1" ruleId="rule-1" />,
    );
    await screen.findByText('row-check');

    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).toHaveTextContent('Associated');
    const source = screen.getByText('row-check');
    expect(within(badge!.closest('div')!).queryByText('row-check')).toBeNull();
    expect(source).not.toBe(badge);
  });
});
