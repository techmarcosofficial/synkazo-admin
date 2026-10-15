import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SubscriptionPlanCard, {
  getPlanVariant,
} from './SubscriptionPlanCard';

describe('SubscriptionPlanCard', () => {
  afterEach(() => {
    cleanup();
  });
  it('correctly maps plan names to variant keys', () => {
    expect(getPlanVariant('Unlimited Plan')).toBe('unlimited');
    expect(getPlanVariant('Pro Plan')).toBe('pro');
    expect(getPlanVariant('Enterprise Custom')).toBe('enterprise');
    expect(getPlanVariant('Starter')).toBe('starter');
    expect(getPlanVariant('Free')).toBe('free');
    expect(getPlanVariant('Special Tier')).toBe('custom');
  });

  it('renders plan name, status, interval, and Stripe provider logo', () => {
    render(
      <SubscriptionPlanCard
        planName="Unlimited"
        status="active"
        billingInterval="month"
        currentPeriodEnd={new Date(Date.now() + 17 * 86_400_000).toISOString()}
        planAccessSource="stripe_subscription"
      />,
    );

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('gracefully handles missing subscription period or free access', () => {
    const { getByText } = render(
      <SubscriptionPlanCard
        planName="Free"
        status="active"
        billingInterval={null}
        currentPeriodEnd={null}
        planAccessSource="free"
      />,
    );

    expect(getByText('Free')).toBeInTheDocument();
    expect(getByText('Ongoing')).toBeInTheDocument();
    expect(getByText('Free Tier')).toBeInTheDocument();
  });

  it('renders badge-type change plan button and triggers callback on click', () => {
    const handleChangePlan = vi.fn();

    const { getByRole } = render(
      <SubscriptionPlanCard
        planName="Unlimited"
        status="active"
        onChangePlan={handleChangePlan}
      />,
    );

    const changePlanBtn = getByRole('button', { name: /change plan/i });
    expect(changePlanBtn).toBeInTheDocument();
    fireEvent.click(changePlanBtn);
    expect(handleChangePlan).toHaveBeenCalledTimes(1);
  });

  it('renders status badge with success token and border-0', () => {
    const { getByText } = render(
      <SubscriptionPlanCard
        planName="Pro"
        status="active"
      />,
    );

    const statusBadge = getByText('active');
    expect(statusBadge).toHaveClass('text-success');
    expect(statusBadge).toHaveClass('border-0');
  });
});
