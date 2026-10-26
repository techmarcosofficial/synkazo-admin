import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import AssignPlanDialog from './AssignPlanDialog';
import type { AdminApiPlan } from '@/types/billing';

const mockPlans: AdminApiPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter Plan',
    description: 'Starter tier',
    sortOrder: 1,
    isActive: true,
    stripeProductId: null,
    lockedFields: [],
    prices: [],
    features: {
      maxProjects: '3',
      maxJobs: '10',
      maxRecordsPerMonth: '50000',
    },
  },
  {
    id: 'plan_pro',
    name: 'Professional Plan',
    description: 'Pro tier',
    sortOrder: 2,
    isActive: true,
    stripeProductId: null,
    lockedFields: [],
    prices: [],
    features: {
      maxProjects: '10',
      maxJobs: '50',
      maxRecordsPerMonth: '250000',
    },
  },
];

function renderDialog(
  overrides: Partial<Parameters<typeof AssignPlanDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <AssignPlanDialog
      open
      onOpenChange={onOpenChange}
      plans={mockPlans}
      currentPlanId="plan_starter"
      currentPlanName="Starter Plan"
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { ...result, onSubmit, onOpenChange };
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  delete proto.scrollIntoView;
  delete proto.hasPointerCapture;
  delete proto.setPointerCapture;
  delete proto.releasePointerCapture;
});

afterEach(() => {
  cleanup();
});

const VALID_REASON = 'Customer requested upgrade to Pro tier';

describe('AssignPlanDialog', () => {
  it('keeps the submit button enabled by default and shows validation errors on empty submit', async () => {
    const { onSubmit } = renderDialog();
    const submitBtn = screen.getByRole('button', { name: /assign plan/i });

    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Please select a plan to assign'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears reason validation error in real time when user enters 10+ characters', async () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /assign plan/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    const reasonInput = screen.getByLabelText(/Reason/i);
    fireEvent.change(reasonInput, { target: { value: VALID_REASON } });

    await waitFor(() => {
      expect(
        screen.queryByText('Audit reason must be at least 10 characters'),
      ).not.toBeInTheDocument();
    });
  });

  it('submits selected plan and reason when valid', async () => {
    const { onSubmit } = renderDialog();

    // Select "Professional Plan"
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Click the Pro option
    const proOption = screen.getByRole('option', { name: /professional plan/i });
    fireEvent.click(proOption);

    const reasonInput = screen.getByLabelText(/Reason/i);
    fireEvent.change(reasonInput, { target: { value: `  ${VALID_REASON}  ` } });

    const submitBtn = screen.getByRole('button', { name: /assign plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('plan_pro', VALID_REASON);
    });
  });

  it('clears server error on plan when user modifies the input', async () => {
    const { rerender } = renderDialog();

    rerender(
      <AssignPlanDialog
        open
        onOpenChange={vi.fn()}
        plans={mockPlans}
        currentPlanId="plan_starter"
        currentPlanName="Starter Plan"
        isSubmitting={false}
        errorMessage="Selected plan is temporarily unavailable"
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Selected plan is temporarily unavailable'),
      ).toBeInTheDocument();
    });

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    const proOption = screen.getByRole('option', { name: /professional plan/i });
    fireEvent.click(proOption);

    await waitFor(() => {
      expect(
        screen.queryByText('Selected plan is temporarily unavailable'),
      ).not.toBeInTheDocument();
    });
  });

  it('disables submit button and shows Assigning... when isSubmitting is true', () => {
    renderDialog({ isSubmitting: true });
    const submitBtn = screen.getByRole('button', { name: /assigning…/i });
    expect(submitBtn).toBeDisabled();
  });
});
