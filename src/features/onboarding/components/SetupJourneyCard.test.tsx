import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SetupJourneyCard from './SetupJourneyCard';

describe('SetupJourneyCard', () => {
  it('clearly distinguishes complete, current, and upcoming steps', () => {
    const openCurrent = vi.fn();

    render(
      <SetupJourneyCard
        eyebrow="Job setup"
        title="Map the fields"
        description="Complete the current step."
        steps={[
          {
            title: 'Connect',
            description: 'Platforms are connected.',
            status: 'complete',
            onSelect: vi.fn(),
          },
          {
            title: 'Field Mapping',
            description: 'Map source and destination fields.',
            status: 'current',
            onSelect: openCurrent,
          },
          {
            title: 'Test & Review',
            description: 'Run the first sync.',
            status: 'upcoming',
          },
          {
            title: 'Automate',
            description: 'Choose a schedule.',
            status: 'upcoming',
            optional: true,
          },
        ]}
      />,
    );

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();

    const currentStep = screen.getByRole('button', {
      name: /field mapping/i,
    });
    expect(currentStep.closest('li')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(currentStep);
    expect(openCurrent).toHaveBeenCalledOnce();

    expect(
      screen.getByRole('button', { name: /test & review/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /continue setup/i }),
    ).not.toBeInTheDocument();
  });

  it('renders solid border and "Current tab" badge when isCurrentTab is true, and dashed border when false', () => {
    render(
      <SetupJourneyCard
        compact
        eyebrow="Project setup"
        title="Project setup"
        description="Verify tab presence"
        steps={[
          {
            title: 'Connect Platforms',
            description: 'Platform connections.',
            status: 'current',
            isCurrentTab: true,
            onSelect: vi.fn(),
          },
          {
            title: 'Create Sync Flow',
            description: 'Create flow on another tab.',
            status: 'current',
            isCurrentTab: false,
            onSelect: vi.fn(),
          },
          {
            title: 'Configure & Test',
            description: 'Upcoming step.',
            status: 'upcoming',
            isCurrentTab: false,
          },
        ]}
      />,
    );

    const step1Btn = screen.getByRole('button', { name: /connect platforms/i });
    const step2Btn = screen.getByRole('button', { name: /create sync flow/i });
    const step3Btn = screen.getByRole('button', { name: /configure & test/i });

    // Step 1: on current tab -> has "Current tab" pill and solid border
    expect(step1Btn).toHaveAttribute('data-step-current-tab', 'true');
    expect(step1Btn.className).toContain('border-solid');
    expect(screen.getByText('Current tab')).toBeInTheDocument();

    // Step 2: on different tab -> dashed border indicating navigation destination
    expect(step2Btn).not.toHaveAttribute('data-step-current-tab');
    expect(step2Btn.className).toContain('border-dashed');

    // Step 3: upcoming -> dashed muted border
    expect(step3Btn.className).toContain('border-dashed');
  });
});
