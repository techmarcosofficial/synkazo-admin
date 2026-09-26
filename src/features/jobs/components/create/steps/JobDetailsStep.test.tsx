import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import JobDetailsStep from './JobDetailsStep';

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: () => true,
    user: { id: 'u1', email: 'test@example.com' },
  }),
}));

vi.mock('@/queries/useEntitlements', () => ({
  useEntitlements: () => ({
    data: { plan: 'growth', isCustomAllowed: true },
    isLoading: false,
  }),
}));

describe('JobDetailsStep Recipes', () => {
  afterEach(cleanup);

  const defaultProps = {
    config: {
      sourcePlatform: 'servicetitan',
      destPlatform: 'hubspot',
      sourceObject: '',
      destObject: '',
      name: '',
      syncDirection: 'one_way',
      sourceOfTruth: 'source',
      deleteHandling: 'ignore',
      hubspotWebhookEnabled: false,
      syncTrigger: 'manual',
      idMappingSourceField: '',
      idMappingDestField: '',
    },
    setConfig: vi.fn(),
    errors: {},
    setErrors: vi.fn(),
    availablePlatforms: [
      { platformId: 'servicetitan', label: 'ServiceTitan' },
      { platformId: 'hubspot', label: 'HubSpot' },
    ],
    objectsByPlatform: {
      servicetitan: [
        { id: 'customers', label: 'Customers' },
        { id: 'jobs', label: 'Jobs' },
        { id: 'invoices', label: 'Invoices' },
      ],
      hubspot: [
        { id: 'contacts', label: 'Contacts' },
        { id: 'companies', label: 'Companies' },
        { id: 'deals', label: 'Deals' },
      ],
    },
    customSourceObjects: [],
    customDestObjects: [],
    onAddCustomObject: vi.fn(),
    projectId: 'proj-1',
  };

  it('renders recommended recipes in a compact 1-row format with popular badges', () => {
    render(
      <TooltipProvider>
        <JobDetailsStep {...defaultProps} />
      </TooltipProvider>,
    );

    expect(screen.getByText('Recommended Sync Recipes (1-Click)')).toBeInTheDocument();
    expect(screen.getByText('Customers → Contacts')).toBeInTheDocument();
    expect(screen.getByText('Customers → Companies')).toBeInTheDocument();
    expect(screen.getByText('Jobs → Deals')).toBeInTheDocument();
    expect(screen.getByText('Invoices → Deals')).toBeInTheDocument();

    const popularBadges = screen.getAllByText('Most Popular');
    expect(popularBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('auto-fills config when clicking a recipe', () => {
    const setConfig = vi.fn();
    render(
      <TooltipProvider>
        <JobDetailsStep {...defaultProps} setConfig={setConfig} />
      </TooltipProvider>,
    );

    const customerContactBtn = screen.getByText('Customers → Contacts').closest('button');
    expect(customerContactBtn).toBeInTheDocument();
    fireEvent.click(customerContactBtn!);

    expect(setConfig).toHaveBeenCalled();
  });

  it('filters out recipe combinations that have already been created as existing jobs', () => {
    render(
      <TooltipProvider>
        <JobDetailsStep
          {...defaultProps}
          existingJobs={[
            { sourceObject: 'customers', destObject: 'contacts' },
            { sourceObject: 'jobs', destObject: 'deals' },
          ]}
        />
      </TooltipProvider>,
    );

    // Created combinations should NOT be shown
    expect(screen.queryByText('Customers → Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Jobs → Deals')).not.toBeInTheDocument();

    // Remaining combinations should still be suggested
    expect(screen.getByText('Customers → Companies')).toBeInTheDocument();
    expect(screen.getByText('Invoices → Deals')).toBeInTheDocument();
  });
});
