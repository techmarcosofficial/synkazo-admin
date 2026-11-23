import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import HeadingPair from './HeadingPair';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

describe('HeadingPair', () => {
  it('moves the subtitle into an info tooltip by default', async () => {
    const user = userEvent.setup();
    render(
      <HeadingPair
        title="Recent Activity"
        subtitle="Latest sync runs and project events."
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent Activity' }),
    ).toBeInTheDocument();
    // The description must not take a line of its own.
    expect(
      screen.queryByText('Latest sync runs and project events.'),
    ).not.toBeInTheDocument();

    const infoButton = screen.getByRole('button', {
      name: /more information/i,
    });

    await user.hover(infoButton);
    expect(
      await screen.findByRole('tooltip', {
        name: 'Latest sync runs and project events.',
      }),
    ).toBeInTheDocument();
  });

  it('renders the subtitle as a paragraph when subtitleInline is set', () => {
    render(
      <HeadingPair
        title="Upcoming Events"
        subtitle="Next scheduled sync runs."
        subtitleInline
      />,
    );

    expect(
      screen.getByText('Next scheduled sync runs.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more information/i }),
    ).not.toBeInTheDocument();
  });

  it('renders no info trigger when there is no subtitle', () => {
    render(<HeadingPair title="Title Only" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Title Only' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more information/i }),
    ).not.toBeInTheDocument();
  });
});
