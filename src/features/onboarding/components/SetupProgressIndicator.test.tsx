import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SetupProgressIndicator from './SetupProgressIndicator';

import type { SetupGuide } from '@/features/onboarding/setupGuide';

function makeGuide(overrides: Partial<SetupGuide> = {}): SetupGuide {
  return {
    label: 'Project setup',
    steps: [
      { title: 'Connect platforms', description: '', status: 'complete' },
      { title: 'Create a sync flow', description: '', status: 'current' },
      { title: 'Configure & test', description: '', status: 'upcoming' },
    ],
    next: {
      title: 'Create your first sync flow',
      instruction: 'Both platforms are connected.',
      actionLabel: 'Create sync flow',
      onGo: vi.fn(),
    },
    ...overrides,
  };
}

function hover(element: Element) {
  fireEvent.pointerEnter(element, { pointerType: 'mouse' });
  act(() => {
    vi.advanceTimersByTime(200);
  });
}

describe('SetupProgressIndicator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders nothing once setup is done', () => {
    const { container } = render(<SetupProgressIndicator guide={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Action needed" with progress, and clicking goes to the next step', () => {
    const guide = makeGuide();
    render(<SetupProgressIndicator guide={guide} />);

    const trigger = screen.getByRole('button', {
      name: 'Project setup: 1 of 3 complete. Action needed: Create your first sync flow',
    });
    expect(trigger).toHaveTextContent('Action needed');
    expect(trigger).toHaveTextContent('33%');

    fireEvent.click(trigger);
    expect(guide.next.onGo).toHaveBeenCalledTimes(1);
  });

  it('opens a panel on hover with the instruction, every step and the action', () => {
    const guide = makeGuide();
    render(<SetupProgressIndicator guide={guide} />);

    hover(screen.getByRole('button', { name: /Project setup/ }).parentElement!);

    const panel = screen.getByRole('dialog', {
      name: 'Project setup next step',
    });
    expect(panel).toHaveTextContent('1 of 3 done');
    expect(panel).toHaveTextContent('Both platforms are connected.');
    const steps = screen.getByRole('list', { name: 'Project setup steps' });
    expect(steps).toHaveTextContent('Connect platformsDone');
    expect(steps).toHaveTextContent('Create a sync flowCurrent step');
    expect(steps).toHaveTextContent('Configure & testPending');

    fireEvent.click(screen.getByRole('button', { name: 'Create sync flow' }));
    expect(guide.next.onGo).toHaveBeenCalledTimes(1);
  });

  it('offers the secondary action inside the panel', () => {
    const onDiscard = vi.fn();
    render(
      <SetupProgressIndicator
        guide={makeGuide({
          secondaryAction: { label: 'Discard draft', onClick: onDiscard },
        })}
      />,
    );

    hover(screen.getByRole('button', { name: /Project setup/ }).parentElement!);
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('says "Next step" when only an optional step is left', () => {
    render(
      <SetupProgressIndicator
        guide={makeGuide({
          steps: [
            { title: 'Map fields', description: '', status: 'complete' },
            {
              title: 'Go live',
              description: '',
              status: 'current',
              optional: true,
            },
          ],
        })}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Project setup/ });
    expect(trigger).toHaveTextContent('Next step');
    expect(trigger).toHaveTextContent('100%');
  });
});
