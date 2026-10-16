import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlanChangeSlider from './PlanChangeSlider';
import type { AdminApiPlan } from '@/types/billing';

const mockPlans: AdminApiPlan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    description: 'Free tier for personal projects',
    sortOrder: 0,
    isActive: true,
    stripeProductId: null,
    lockedFields: [],
    prices: [
      {
        id: 'pr-free',
        amount: 0,
        billingInterval: 'month',
        currency: 'usd',
        stripePriceId: 'p_free',
        isActive: true,
        discountPercent: null,
      },
    ],
    features: { maxProjects: '2', maxJobs: '5', maxRecordsPerMonth: '500' },
  },
  {
    id: 'plan-starter',
    name: 'Starter',
    description: 'Starter tier for small teams',
    sortOrder: 1,
    isActive: true,
    stripeProductId: 'prod_starter',
    lockedFields: [],
    prices: [
      {
        id: 'pr-starter',
        amount: 2900,
        billingInterval: 'month',
        currency: 'usd',
        stripePriceId: 'p_starter',
        isActive: true,
        discountPercent: null,
      },
    ],
    features: { maxProjects: '5', maxJobs: '20', maxRecordsPerMonth: '10000' },
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    description: 'Professional tier for growing businesses',
    sortOrder: 2,
    isActive: true,
    stripeProductId: 'prod_pro',
    lockedFields: [],
    prices: [
      {
        id: 'pr-pro',
        amount: 7900,
        billingInterval: 'month',
        currency: 'usd',
        stripePriceId: 'p_pro',
        isActive: true,
        discountPercent: null,
      },
    ],
    features: { maxProjects: '15', maxJobs: '50', maxRecordsPerMonth: '50000' },
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    description: 'Custom quotas and dedicated support',
    sortOrder: 3,
    isActive: true,
    stripeProductId: 'prod_enterprise',
    lockedFields: [],
    prices: [
      {
        id: 'pr-enterprise',
        amount: 19900,
        billingInterval: 'month',
        currency: 'usd',
        stripePriceId: 'p_enterprise',
        isActive: true,
        discountPercent: null,
      },
    ],
    features: { maxProjects: '50', maxJobs: '200', maxRecordsPerMonth: '500000' },
  },
  {
    id: 'plan-unlimited',
    name: 'Unlimited',
    description: 'Complete uncapped capacity',
    sortOrder: 4,
    isActive: true,
    stripeProductId: 'prod_unlimited',
    lockedFields: [],
    prices: [
      {
        id: 'pr-unlimited',
        amount: 39900,
        billingInterval: 'month',
        currency: 'usd',
        stripePriceId: 'p_unlimited',
        isActive: true,
        discountPercent: null,
      },
    ],
    features: { maxProjects: 'null', maxJobs: 'null', maxRecordsPerMonth: 'null' },
  },
];

describe('PlanChangeSlider', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PlanChangeSlider
        plans={mockPlans}
        currentPlanId="plan-starter"
        currentPlanName="Starter"
        isOpen={false}
        onClose={vi.fn()}
        onSavePlanChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders 2 cards per slide and handles pagination', () => {
    render(
      <PlanChangeSlider
        plans={mockPlans}
        currentPlanId="plan-starter"
        currentPlanName="Starter"
        isOpen={true}
        onClose={vi.fn()}
        onSavePlanChange={vi.fn()}
      />,
    );

    // Header title
    expect(screen.getByText('Change Plan')).toBeInTheDocument();
    // 5 total plans - 1 current (Starter) = 4 available plans across 2 pages
    expect(screen.getByText('1/2')).toBeInTheDocument();

    // Slide 1 has Free and Pro (Starter is excluded as current plan)
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();

    // Next button
    const nextBtn = screen.getByRole('button', { name: /next plans/i });
    fireEvent.click(nextBtn);

    // Slide 2 has Enterprise and Unlimited
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('allows selecting a plan and requires at least 10 chars reason to save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanChangeSlider
        plans={mockPlans}
        currentPlanId="plan-free"
        currentPlanName="Free"
        isOpen={true}
        onClose={vi.fn()}
        onSavePlanChange={onSave}
      />,
    );

    // Select Starter
    const starterCard = screen.getByText('Starter');
    fireEvent.click(starterCard);

    // Reason box should appear
    expect(screen.getByText(/Audit Reason/)).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /save & change plan/i });
    expect(saveBtn).toBeDisabled();

    // Quick tag click
    const quickTag = screen.getByText('+Customer requested upgrade');
    fireEvent.click(quickTag);

    // Now reason has 26 chars > 10 chars, button should be enabled
    expect(saveBtn).toBeEnabled();

    // Click save
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledWith('plan-starter', 'Customer requested upgrade');
  });

  it('opens plan details preview dialog when clicking the eye button', () => {
    render(
      <PlanChangeSlider
        plans={mockPlans}
        currentPlanId="plan-free"
        currentPlanName="Free"
        isOpen={true}
        onClose={vi.fn()}
        onSavePlanChange={vi.fn()}
      />,
    );

    const eyeBtn = screen.getByRole('button', { name: /view full starter details/i });
    fireEvent.click(eyeBtn);

    expect(screen.getByText('Starter Plan Details')).toBeInTheDocument();
    expect(screen.getByText(/Resource Limits & Quotas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select this plan/i })).toBeInTheDocument();
  });
});
