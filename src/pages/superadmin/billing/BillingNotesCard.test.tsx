import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BillingNotesCard from './BillingNotesCard';

const mockNotes = [
  {
    id: 'note-1',
    category: 'billing',
    body: 'Customer contacted support regarding card charge failure.',
    createdByEmail: 'admin@synkazo.test',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminNotesQuery: vi.fn(() => ({
    data: mockNotes,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useCreateSuperAdminNoteMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteSuperAdminNoteMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));

describe('BillingNotesCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders billing notes title, badge count, and note items', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BillingNotesCard organisationId="org-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Billing Notes')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(
      screen.getByText('Customer contacted support regarding card charge failure.'),
    ).toBeInTheDocument();
    expect(screen.getByText('admin@synkazo.test')).toBeInTheDocument();
  });

  it('appends quick tag to textarea when clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BillingNotesCard organisationId="org-1" />
      </QueryClientProvider>,
    );

    const quickTagBtn = screen.getByText('+Payment Follow-up');
    fireEvent.click(quickTagBtn);

    const textarea = screen.getByLabelText('New billing note') as HTMLTextAreaElement;
    expect(textarea.value).toContain('[Payment Follow-up]: ');
  });
});
