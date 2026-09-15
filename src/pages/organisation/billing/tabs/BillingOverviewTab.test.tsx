import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BillingOverviewTab from './BillingOverviewTab';

const mocks = vi.hoisted(() => ({
  plan: {
    planId: 'pro',
    planName: 'Pro',
    subscriptionStatus: 'active',
    billingInterval: 'month',
    trialEndsAt: null,
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    limits: {
      maxProjects: null,
      maxJobs: null,
      maxRecordsPerMonth: 1000,
      schedulingModes: ['daily', 'interval', 'cron'],
      minIntervalMinutes: null,
      allowedTransformTypes: ['direct', 'custom'],
      associationRules: false,
      customObjects: true,
      customFields: false,
      jobDependencyChains: false,
      envMigration: false,
      priorityScheduling: true,
      logRetentionDays: 7,
      maxTeamMembers: null,
    },
    overLimit: {
      projects: { count: 7, limit: null },
      jobs: { count: 19, limit: null },
      records: { count: 1203, limit: 1000 },
      teamMembers: { count: 3, limit: null },
    },
  },
  usage: {
    recordsSynced: 1203,
    maxRecordsPerMonth: 1000,
  },
}));

vi.mock('@/queries/useBilling', () => ({
  usePlanQuery: () => ({
    data: mocks.plan,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUsageQuery: () => ({
    data: mocks.usage,
    isLoading: false,
  }),
  usePlansQuery: () => ({
    data: [
      {
        id: 'pro',
        prices: [
          {
            billingInterval: 'month',
            amount: 4900,
            currency: 'usd',
          },
        ],
      },
    ],
  }),
}));

afterEach(cleanup);

describe('BillingOverviewTab', () => {
  it('shows the compact subscription, limits, and upcoming billing cards', () => {
    const { container } = render(
      <MemoryRouter>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    expect(screen.getByText('Subscription overview')).toBeInTheDocument();
    expect(screen.getByText('1,203 of 1,000 records used')).toBeInTheDocument();
    expect(
      screen.getByText('Monthly record limit reached'),
    ).toBeInTheDocument();
    expect(screen.getByText('Plan limits & features')).toBeInTheDocument();
    expect(screen.getByText('Upcoming billing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View invoices' })).toHaveAttribute(
      'href',
      '/organization/billing/invoices',
    );
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(3);
  });
});
