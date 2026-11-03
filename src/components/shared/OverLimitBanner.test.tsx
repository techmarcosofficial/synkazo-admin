import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OverLimitBanner from './OverLimitBanner';

const mockState = vi.hoisted(() => ({
  planData: null as unknown,
}));

vi.mock('@/queries/useBilling', () => ({
  usePlanQuery: () => ({
    data: mockState.planData,
  }),
}));

afterEach(() => {
  cleanup();
});

describe('OverLimitBanner', () => {
  it('does not render when the organisation is at its limit (1 / 1) and isOverLimit is false', () => {
    mockState.planData = {
      planName: 'Basic',
      overLimit: {
        projects: { count: 0, limit: 1, over: false, canAdd: true },
        jobs: { count: 0, limit: 5, over: false, canAdd: true },
        teamMembers: { count: 1, limit: 1, over: false, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: false,
      },
    };

    const { container } = render(<OverLimitBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when an organisation actually exceeds its member limit (downgrade)', () => {
    mockState.planData = {
      planName: 'Basic',
      overLimit: {
        projects: { count: 0, limit: 1, over: false, canAdd: true },
        jobs: { count: 0, limit: 5, over: false, canAdd: true },
        teamMembers: { count: 2, limit: 1, over: true, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: true,
      },
    };

    render(<OverLimitBanner />);

    expect(
      screen.getByText("You're over your Basic plan limit"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 team members \(limit 1\)/),
    ).toBeInTheDocument();
  });

  it('banner copy does not claim that syncing is paused due to resource limits', () => {
    mockState.planData = {
      planName: 'Basic',
      overLimit: {
        projects: { count: 2, limit: 1, over: true, canAdd: false },
        jobs: { count: 6, limit: 5, over: true, canAdd: false },
        teamMembers: { count: 2, limit: 1, over: true, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: true,
      },
    };

    render(<OverLimitBanner />);

    const alertText = screen.getByRole('alert').textContent || '';

    // Must state that creating new resources is paused
    expect(alertText).toContain('Creating new resources is paused');
    // Must NOT claim that syncing is paused
    expect(alertText).not.toContain('syncing on the extra items are paused');
    expect(alertText).not.toContain('syncing');
  });
});
