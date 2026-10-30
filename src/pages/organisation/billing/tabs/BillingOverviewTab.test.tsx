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
    periodStart: '2026-09-01T00:00:00.000Z',
  },
  subscription: {
    status: 'active',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    creditBalance: 0,
    pendingPriceId: null,
    pendingPlanId: null,
    pendingPlanChangeAt: null,
  },
  paymentMethods: [
    {
      id: 'pm-1',
      cardBrand: 'visa',
      cardLast4: '4242',
      cardExpMonth: 12,
      cardExpYear: 2028,
      isDefault: true,
    },
  ],
  history: {
    total: 1,
    page: 1,
    pageSize: 10,
    items: [
      {
        id: 'ev-1',
        eventType: 'subscription.updated',
        description: 'Monthly subscription renewal',
        createdAt: '2026-09-01T00:00:00.000Z',
        amount: 2900,
        currency: 'usd',
        orderStatus: 'paid',
      },
    ],
  },
  invoices: {
    total: 1,
    page: 1,
    pageSize: 10,
    items: [
      {
        id: 'in_123',
        status: 'paid',
        totalAmount: 2900,
        currency: 'usd',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-10-01T00:00:00.000Z',
        paidAt: '2026-09-01T00:00:00.000Z',
        receiptUrl: 'https://pay.stripe.com/receipts/in_123',
      },
    ],
  },
}));

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: true,
  stripePromise: Promise.resolve(null),
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
    isError: false,
    refetch: vi.fn(),
  }),
  usePlansQuery: () => ({
    data: [
      {
        id: 'pro',
        name: 'Pro',
        prices: [
          {
            id: 'price-pro-month',
            amount: 2900,
            currency: 'usd',
            billingInterval: 'month',
          },
        ],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSubscriptionQuery: () => ({
    data: mocks.subscription,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePaymentMethodsQuery: () => ({
    data: mocks.paymentMethods,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useHistoryQuery: () => ({
    data: mocks.history,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePaymentHistoryQuery: () => ({
    data: mocks.history,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useInvoicesQuery: () => ({
    data: mocks.invoices,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCancelScheduledChangeMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelSubscriptionMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useReactivateMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSetDefaultPaymentMethodMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRemovePaymentMethodMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useAddPaymentMethodMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

afterEach(cleanup);

describe('BillingOverviewTab', () => {
  it('renders Overview section with subscription ATM card, limits, payment method, upcoming billing, and sub-sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/organization/billing']}>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    // Sub-sidebar Navigation items exist
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manage cards').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invoices & Payments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Billing Activity').length).toBeGreaterThan(0);

    // Plan ATM Card
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Change Plan')).toBeInTheDocument();

    // Upcoming Billing & Payment Method Consolidated Card
    expect(screen.getByText('Payment Method on File')).toBeInTheDocument();
    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('Expires 12/2028')).toBeInTheDocument();
    expect(screen.getAllByText('Upcoming billing').length).toBeGreaterThanOrEqual(1);

    // Limits & Features
    expect(screen.getByText('Plan limits & features')).toBeInTheDocument();
    expect(screen.getByText('1,203 of 1,000 records used')).toBeInTheDocument();
    expect(
      screen.getByText('Monthly record limit reached'),
    ).toBeInTheDocument();
  });

  it('renders Manage Cards section with direct cards list and top corner add button', () => {
    render(
      <MemoryRouter initialEntries={['/organization/billing?section=cards']}>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    expect(screen.getByText('Payment methods')).toBeInTheDocument();
    expect(screen.getByText('Add card')).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
  });

  it('renders Invoices & Payment History section with both dedicated tables', () => {
    render(
      <MemoryRouter initialEntries={['/organization/billing?section=invoices']}>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    expect(screen.getByText('All invoices')).toBeInTheDocument();
    expect(screen.getByText('All payment history')).toBeInTheDocument();
    expect(screen.getByText('in_123'.slice(0, 8))).toBeInTheDocument();
  });

  it('renders Billing Activity section with chronological events', () => {
    render(
      <MemoryRouter initialEntries={['/organization/billing?section=activity']}>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Billing Activity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Monthly subscription renewal').length).toBeGreaterThanOrEqual(1);
  });
});
