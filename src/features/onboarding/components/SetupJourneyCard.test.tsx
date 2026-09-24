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
});
