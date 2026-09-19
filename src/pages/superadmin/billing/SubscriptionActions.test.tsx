import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SubscriptionActions from './SubscriptionActions';

import type { SuperAdminOrganisationDetail } from '@/types';

const orgFixture: SuperAdminOrganisationDetail = {
  id: 'org-1',
  name: 'Northwind HVAC',
  slug: 'northwind',
  description: null,
  logoUrl: null,
  status: 'active',
  owner: null,
  settings: { defaultCurrency: null },
  plan: { id: 'plan-pro', name: 'Pro', subscriptionStatus: 'active' },
  access: {
    mode: 'super_admin_organisation_access',
    planRestrictionsBypassed: true,
    canManage: true,
  },
  usage: {
    members: { total: 6, active: 6, limit: 10 },
    projects: { count: 3, limit: 10, over: false },
    jobs: { count: 12, limit: 50, over: false },
    records: {
      used: 100,
      limit: 1000,
      remaining: 900,
      periodStart: new Date().toISOString(),
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('@/api/superAdminSubscription', () => ({
  superAdminSubscriptionApi: {
    cancelAtPeriodEnd: vi.fn(),
    resume: vi.fn(),
    cancelImmediate: vi.fn(),
  },
}));

function renderComponent(
  overrides: Partial<React.ComponentProps<typeof SubscriptionActions>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SubscriptionActions
          organisation={orgFixture}
          subscriptionStatus="active"
          cancelAtPeriodEnd={false}
          {...overrides}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('SubscriptionActions', () => {
  it('shows cancel + cancel-immediate when a subscription is active with no scheduled cancel', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /cancel at period end/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /cancel immediately/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resume subscription/i }),
    ).toBeNull();
  });

  it('shows resume + cancel-immediate when the subscription is pending_cancel', () => {
    renderComponent({
      subscriptionStatus: 'pending_cancel',
      cancelAtPeriodEnd: true,
    });
    expect(
      screen.getByRole('button', { name: /resume subscription/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /cancel immediately/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancel at period end/i }),
    ).toBeNull();
  });

  it('hides every button when the subscription is already canceled', () => {
    renderComponent({ subscriptionStatus: 'canceled' });
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /resume subscription/i }),
    ).toBeNull();
  });

  it('hides every button when there is no subscription (none)', () => {
    renderComponent({ subscriptionStatus: 'none' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the cancel-at-period-end dialog on click', () => {
    renderComponent();
    fireEvent.click(
      screen.getByRole('button', { name: /cancel at period end/i }),
    );
    expect(
      screen.getByText(/Cancel subscription at period end/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /schedule cancellation/i }),
    ).toBeInTheDocument();
  });

  it('opens the cancel-immediate dialog requiring name confirmation', () => {
    renderComponent();
    fireEvent.click(
      screen.getByRole('button', { name: /cancel immediately/i }),
    );
    expect(
      screen.getByText(/Cancel subscription immediately/i),
    ).toBeInTheDocument();
    // The dialog uses LifecycleConfirmDialog which prompts for the org
    // name to confirm — the input is labelled by that confirmation.
    expect(screen.getByLabelText(/to confirm/i)).toBeInTheDocument();
  });
});
