import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GuideStepper from './GuideStepper';
import { computeGuideProgress } from './guideSteps';

const progress = computeGuideProgress({
  connected: true,
  jobCreated: true,
  mapped: false,
  tested: false,
  scheduled: false,
});

describe('GuideStepper', () => {
  afterEach(cleanup);

  it('shows a done count, not a percentage', () => {
    render(<GuideStepper progress={progress} viewStep="map" onGo={vi.fn()} />);
    expect(screen.getByText('3 of 6 done')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/action needed/i)).not.toBeInTheDocument();
  });

  it('locks Next until the step being viewed is finished', () => {
    render(<GuideStepper progress={progress} viewStep="map" onGo={vi.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('moves between finished steps with Prev and Next', () => {
    const onGo = vi.fn();
    render(<GuideStepper progress={progress} viewStep="job" onGo={onGo} />);
    fireEvent.click(screen.getByRole('button', { name: /next: map/i }));
    expect(onGo).toHaveBeenCalledWith('map');
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onGo).toHaveBeenCalledWith('connect');
  });

  it('offers to continue from a tab outside the setup path', () => {
    const onGo = vi.fn();
    render(<GuideStepper progress={progress} viewStep={null} onGo={onGo} />);
    fireEvent.click(screen.getByRole('button', { name: /continue setup/i }));
    expect(onGo).toHaveBeenCalledWith('map');
  });
});
