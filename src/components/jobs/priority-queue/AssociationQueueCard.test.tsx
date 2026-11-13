import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import AssociationQueueCard from './AssociationQueueCard';

vi.mock('@/queries/usePriorityQueue', () => ({
  useAssociationRuleOptionsQuery: vi.fn(),
}));

import { useAssociationRuleOptionsQuery } from '@/queries/usePriorityQueue';

describe('AssociationQueueCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders link to add associations when no association rules exist', () => {
    vi.mocked(useAssociationRuleOptionsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AssociationQueueCard
            projectId="proj-123"
            queue={{
              associationQueueEnabled: true,
              associationDelayMinutes: 0,
            } as any}
            items={[]}
            onChange={vi.fn()}
            savedRevision={1}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Header has InfoTip
    expect(
      screen.getByRole('button', { name: /About Association Queue/i }),
    ).toBeInTheDocument();

    // Check link in empty state
    const links = screen.getAllByRole('link', { name: /Add association/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute(
      'href',
      '/projects/proj-123?tab=settings&section=associations',
    );
  });
});
