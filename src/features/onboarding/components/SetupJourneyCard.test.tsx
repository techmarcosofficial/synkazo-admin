import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByText('Up next')).toBeInTheDocument();
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

    // Step 1: on current tab -> has "Current tab" pill
    expect(step1Btn).toHaveAttribute('data-step-current-tab', 'true');
    expect(step1Btn).toHaveAttribute('data-step-status', 'current');
    expect(screen.getByText('Current tab')).toBeInTheDocument();

    // Step 2: on different tab -> no pill, still the highlighted current step
    expect(step2Btn).not.toHaveAttribute('data-step-current-tab');
    expect(step2Btn).toHaveAttribute('data-step-status', 'current');

    // Steps are flat rows separated by dividers, not nested bordered cards
    expect(step3Btn).toHaveAttribute('data-step-status', 'upcoming');
    [step1Btn, step2Btn, step3Btn].forEach((btn) =>
      expect(btn.className).not.toMatch(/\bborder-(solid|dashed)\b/),
    );
  });
  it('shows only the first unfinished step without numbers when currentStepOnly is set', () => {
    const { container } = render(
      <SetupJourneyCard
        compact
        currentStepOnly
        eyebrow="Project setup"
        title="Set up your project"
        description="How to set up"
        steps={[
          {
            title: 'Connect Platforms',
            description: 'Done.',
            status: 'complete',
          },
          {
            title: 'Create Sync Flow',
            description: 'Next.',
            status: 'current',
            onSelect: vi.fn(),
          },
          {
            title: 'Configure & Test',
            description: 'Later.',
            status: 'upcoming',
          },
        ]}
      />,
    );
    // Earlier tests in this file don't unmount, so scope queries to this render.
    const view = within(container);

    const current = view.getByRole('button', { name: /create sync flow/i });
    expect(current).not.toHaveTextContent('2');
    expect(view.queryByText('Connect Platforms')).not.toBeInTheDocument();
    expect(view.queryByText('Configure & Test')).not.toBeInTheDocument();
    // The count still covers every step, not just the visible one
    expect(view.getByText('1 of 3 done')).toBeInTheDocument();
  });
});
