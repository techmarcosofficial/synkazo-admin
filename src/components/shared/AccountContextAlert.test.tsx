import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountContextAlert from './AccountContextAlert';
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

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
  useAlertDismissStore.setState({ dismissed: {} });
});

describe('AccountContextAlert', () => {
  it('does not render OverLimitBanner when organization is at limit 1/1 (not over limit)', () => {
    mockState.planData = {
      subscriptionStatus: 'active',
      planName: 'Basic',
      overLimit: {
        projects: { count: 0, limit: 1, over: false, canAdd: true },
        jobs: { count: 0, limit: 5, over: false, canAdd: true },
        teamMembers: { count: 1, limit: 1, over: false, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: false,
      },
    };

    const { container } = render(<AccountContextAlert />);
    expect(container.firstChild).toBeNull();
  });

  it('renders OverLimitBanner when organization is actually over plan limit', () => {
    mockState.planData = {
      subscriptionStatus: 'active',
      planName: 'Basic',
      overLimit: {
        projects: { count: 0, limit: 1, over: false, canAdd: true },
        jobs: { count: 0, limit: 5, over: false, canAdd: true },
        teamMembers: { count: 2, limit: 1, over: true, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: true,
      },
    };

    render(<AccountContextAlert />);
    expect(
      screen.getByText("You're over your Basic plan limit"),
    ).toBeInTheDocument();
  });
});
