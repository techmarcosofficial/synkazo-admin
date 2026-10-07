import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SubscriptionPaywall from './SubscriptionPaywall';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import type { PricingPlan } from '@/types/pricing';

vi.mock('@/hooks/usePricingPlans', () => ({ usePricingPlans: vi.fn() }));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ logout: vi.fn() }),
}));

const makePlan = (index: number): PricingPlan => ({
  id: `plan-${index}`,
  name: `Plan ${index}`,
  tagline: 'Plan details',
  price: { month: '$10', year: '$100' },
  period: { month: '/month', year: '/year' },
  features: [],
  previewFeatures: [],
  highlighted: false,
  sellable: true,
  rawFeatures: {},
});

function renderWithPlans(count: number) {
  vi.mocked(usePricingPlans).mockReturnValue({
    plans: Array.from({ length: count }, (_, index) => makePlan(index)),
    isLoading: false,
  });
  return render(
    <MemoryRouter>
      <SubscriptionPaywall />
    </MemoryRouter>,
  );
}

describe('SubscriptionPaywall plan navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a regular grid when the catalogue has three plans', () => {
    renderWithPlans(3);
    expect(screen.queryByRole('button', { name: 'Next plan' })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('moves exactly one card when the next button is used', () => {
    const { container } = renderWithPlans(5);
    const viewport = screen.getByRole('region', { name: 'Available plans' });
    const slides = container.querySelectorAll<HTMLElement>('[data-plan-slide]');

    Object.defineProperties(viewport, {
      clientWidth: { value: 300 },
      scrollWidth: { value: 500 },
      scrollLeft: { value: 0, writable: true },
    });
    slides.forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { value: index * 100 });
    });
    const scrollTo = vi.fn(({ left }: { left: number }) => {
      viewport.scrollLeft = left;
      fireEvent.scroll(viewport);
    });
    Object.defineProperty(viewport, 'scrollTo', { value: scrollTo });
    fireEvent.scroll(viewport);

    expect(
      screen.getByRole('button', { name: 'Previous plan' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next plan' }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
    expect(screen.getByRole('button', { name: 'Previous plan' })).toBeEnabled();

    viewport.scrollLeft = 200;
    fireEvent.scroll(viewport);
    expect(screen.getByRole('button', { name: 'Next plan' })).toBeDisabled();
  });
});
