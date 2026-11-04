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
  it('renders title and subtitle below as a paragraph by default', () => {
    render(
      <HeadingPair
        title="Recent Activity"
        subtitle="Latest sync runs and project events."
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent Activity' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Latest sync runs and project events.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more information/i }),
    ).not.toBeInTheDocument();
  });

  it('renders subtitle inside tooltip when subtitleInTooltip is true', async () => {
    const user = userEvent.setup();
    render(
      <HeadingPair
        title="Recent Activity"
        subtitle="Latest sync runs and project events."
        subtitleInTooltip
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent Activity' }),
    ).toBeInTheDocument();

    const infoButton = screen.getByRole('button', {
      name: /more information/i,
    });
    expect(infoButton).toBeInTheDocument();

    await user.hover(infoButton);
    expect(
      await screen.findByRole('tooltip', {
        name: 'Latest sync runs and project events.',
      }),
    ).toBeInTheDocument();
  });

  it('renders subtitle inside tooltip when subtitleAsTooltip is true', async () => {
    const user = userEvent.setup();
    render(
      <HeadingPair
        title="Upcoming Events"
        subtitle="Next scheduled sync runs."
        subtitleAsTooltip
      />,
    );

    const infoButton = screen.getByRole('button', {
      name: /more information/i,
    });
    expect(infoButton).toBeInTheDocument();

    await user.hover(infoButton);
    expect(
      await screen.findByRole('tooltip', {
        name: 'Next scheduled sync runs.',
      }),
    ).toBeInTheDocument();
  });

  it('does not render tooltip button when no subtitle is provided even if subtitleInTooltip is true', () => {
    render(<HeadingPair title="Title Only" subtitleInTooltip />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Title Only' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more information/i }),
    ).not.toBeInTheDocument();
  });
});
