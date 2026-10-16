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
    items: [
      {
        id: 'h-1',
        paymentId: 'pi-1',
        eventType: 'payment_succeeded',
        createdAt: '2026-09-15T10:00:00Z',
        amount: 4900,
        currency: 'usd',
        orderStatus: 'paid',
        description: 'Monthly subscription renewal',
      },
    ],
    total: 1,
  },
  invoices: {
    items: [
      {
        id: 'inv-1',
        status: 'paid',
        totalAmount: 4900,
        currency: 'usd',
        paidAt: '2026-09-15T10:00:00Z',
        periodStart: '2026-09-01T00:00:00Z',
        periodEnd: '2026-10-01T00:00:00Z',
        receiptUrl: 'https://stripe.com/receipt/inv-1',
      },
    ],
    total: 1,
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
        name: 'Pro',
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
}));

afterEach(cleanup);

describe('BillingOverviewTab', () => {
  it('shows the subscription ATM card, limits, payment method, upcoming billing, and unified history', () => {
    render(
      <MemoryRouter>
        <BillingOverviewTab />
      </MemoryRouter>,
    );

    // Plan ATM Card
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Change Plan')).toBeInTheDocument();

    // Payment Method on File
    expect(screen.getByText('Payment Method on File')).toBeInTheDocument();
    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('Expires 12/2028')).toBeInTheDocument();

    // Upcoming Billing
    expect(screen.getByText('Upcoming billing')).toBeInTheDocument();

    // Limits & Features
    expect(screen.getByText('Plan limits & features')).toBeInTheDocument();
    expect(screen.getByText('1,203 of 1,000 records used')).toBeInTheDocument();
    expect(
      screen.getByText('Monthly record limit reached'),
    ).toBeInTheDocument();

    // Unified Billing & Payment History (Table Card)
    expect(screen.getByText('Billing & Payment History')).toBeInTheDocument();
    expect(screen.getByText('Payment History (1)')).toBeInTheDocument();
    expect(screen.getByText('Invoices (1)')).toBeInTheDocument();

    // Dedicated Billing Activity Tree Card in Right Column
    expect(screen.getByText('Billing Activity')).toBeInTheDocument();
    expect(screen.getAllByText('Monthly subscription renewal').length).toBeGreaterThanOrEqual(1);
  });
});
