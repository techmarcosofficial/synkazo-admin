import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BillingGuidedTour from './BillingGuidedTour';

describe('BillingGuidedTour', () => {
  afterEach(cleanup);

  it('opens each billing section it describes', () => {
    const onSection = vi.fn();
    render(
      <BillingGuidedTour active onDone={vi.fn()} onSection={onSection} />,
    );
    expect(onSection).toHaveBeenLastCalledWith('overview');
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();

    // Steps 2-4 point at overview cards that aren't rendered here, so use the keyboard.
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSection).toHaveBeenLastCalledWith('cards');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSection).toHaveBeenLastCalledWith('invoices');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSection).toHaveBeenLastCalledWith('activity');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onSection).toHaveBeenLastCalledWith('invoices');
  });

  it('asks before skipping and finishes on Done', () => {
    const onDone = vi.fn();
    render(<BillingGuidedTour active onDone={onDone} onSection={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
