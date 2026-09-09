import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CompanyOwnerSection from './CompanyOwnerSection';

import {
  useCompanyOwnerLogsQuery,
  useCompanyOwnerResultsQuery,
  useRunAllCompanyOwnersMutation,
} from '@/queries/useAssociations';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

vi.mock('@/queries/useAssociations', () => ({
  useCompanyOwnerLogsQuery: vi.fn(),
  useCompanyOwnerResultsQuery: vi.fn(),
  useRunAllCompanyOwnersMutation: vi.fn(),
}));

const useLogsQuery = vi.mocked(useCompanyOwnerLogsQuery);
const useResultsQuery = vi.mocked(useCompanyOwnerResultsQuery);
const useRunMutation = vi.mocked(useRunAllCompanyOwnersMutation);
const refetchLogs = vi.fn();
const refetchResults = vi.fn();
const mutateAsync = vi.fn();

const partialRun = {
  id: 'run-1',
  status: 'partial' as const,
  startedAt: '2026-01-02T10:00:00.000Z',
  completedAt: '2026-01-02T10:00:10.000Z',
  triggeredBy: 'manual',
  hsTotalCount: 10,
  hsSuccessCount: 7,
  hsSkippedCount: 2,
  hsFailedCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  useLogsQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: refetchLogs,
  } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);
  useResultsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: refetchResults,
  } as unknown as ReturnType<typeof useCompanyOwnerResultsQuery>);
  useRunMutation.mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as ReturnType<typeof useRunAllCompanyOwnersMutation>);
});

afterEach(() => {
  cleanup();
  useConfirmDialogStore.getState().close();
});

describe('CompanyOwnerSection', () => {
  it('shows focused execution, summary, and empty run-history states', () => {
    render(<CompanyOwnerSection projectId="project-1" />);

    expect(screen.getByText('Company owner association')).toBeInTheDocument();
    expect(screen.getByText('Recent runs')).toBeInTheDocument();
    expect(
      screen.getByText('No owner-assignment runs yet'),
    ).toBeInTheDocument();
    expect(screen.getByText('Processed').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Associated').parentElement).toHaveTextContent('0');
  });

  it('shows partial run metrics and reveals selectable company results', async () => {
    useLogsQuery.mockReturnValue({
      data: [partialRun],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchLogs,
    } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);
    useResultsQuery.mockReturnValue({
      data: {
        items: [
          {
            hsId: 'company-1',
            camValue: 'alex@example.com',
            resolvedEmails: ['alex@example.com'],
            assignedHsOwnerId: 'owner-1',
            companyName: 'Acme Company',
            ownerName: 'Alex Owner',
            associatedAt: '2026-01-02T10:00:08.000Z',
            result: 'success',
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
        runId: 'run-1',
        runStartedAt: partialRun.startedAt,
        runStatus: 'partial',
      },
      isLoading: false,
      isError: false,
      refetch: refetchResults,
    } as unknown as ReturnType<typeof useCompanyOwnerResultsQuery>);

    render(<CompanyOwnerSection projectId="project-1" />);

    expect(screen.getByText('Processed').parentElement).toHaveTextContent('10');
    expect(screen.getByText('Associated').parentElement).toHaveTextContent('7');
    expect(screen.getByText('Skipped').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Failed').parentElement).toHaveTextContent('1');

    await userEvent.click(
      screen.getByRole('button', { name: /10 companies/i }),
    );

    expect(screen.getByText('Run results')).toBeInTheDocument();
    expect(screen.getByText('Acme Company')).toBeInTheDocument();
    expect(screen.getByText('Alex Owner')).toBeInTheDocument();
    expect(useResultsQuery).toHaveBeenLastCalledWith(
      'project-1',
      expect.objectContaining({ runId: 'run-1', page: 1, status: 'all' }),
    );
  });

  it('confirms the run consequence before starting owner assignment', async () => {
    useLogsQuery.mockReturnValue({
      data: [partialRun],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchLogs,
    } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);
    mutateAsync.mockResolvedValue({
      hubspot: { total: 3, success: 3, skipped: 0, failed: 0 },
    });

    render(<CompanyOwnerSection projectId="project-1" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Associate Owners' }),
    );

    expect(useConfirmDialogStore.getState()).toMatchObject({
      open: true,
      title: 'Associate company owners?',
      confirmLabel: 'Associate Owners',
    });

    await useConfirmDialogStore.getState().onConfirm?.();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({}));
  });

  it('locks duplicate execution and explains the running state', () => {
    useRunMutation.mockReturnValue({
      isPending: true,
      mutateAsync,
    } as unknown as ReturnType<typeof useRunAllCompanyOwnersMutation>);

    render(<CompanyOwnerSection projectId="project-1" />);

    expect(
      screen.getByText(/owner assignment is running/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('keeps a failed manual run visible for retry', async () => {
    useLogsQuery.mockReturnValue({
      data: [partialRun],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchLogs,
    } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);
    mutateAsync.mockRejectedValue({
      response: { data: { message: 'HubSpot owner service unavailable.' } },
    });

    render(<CompanyOwnerSection projectId="project-1" />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Associate Owners' }),
    );

    await act(async () => {
      await expect(
        useConfirmDialogStore.getState().onConfirm?.(),
      ).rejects.toBeTruthy();
    });

    expect(
      await screen.findByText('HubSpot owner service unavailable.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Associate Owners' }),
    ).toBeEnabled();
  });

  it('paginates recent runs without losing the selected workflow context', async () => {
    const runs = Array.from({ length: 12 }, (_, index) => ({
      ...partialRun,
      id: `run-${index + 1}`,
      hsTotalCount: index + 1,
    }));
    useLogsQuery.mockReturnValue({
      data: runs,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchLogs,
    } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);

    render(<CompanyOwnerSection projectId="project-1" />);
    expect(screen.queryByText('12 companies')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('12 companies')).toBeInTheDocument();
    expect(screen.getByText(/Showing 11–12 of 12/)).toBeInTheDocument();
  });

  it('keeps run-history loading failures retryable', async () => {
    useLogsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: refetchLogs,
    } as unknown as ReturnType<typeof useCompanyOwnerLogsQuery>);

    render(<CompanyOwnerSection projectId="project-1" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchLogs).toHaveBeenCalledOnce();
  });
});
