import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';

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

describe('CardHeader description collapsing', () => {
  it('lifts a CardDescription sibling into an info tooltip', async () => {
    const user = userEvent.setup();
    render(
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose which sync updates arrive by email.
          </CardDescription>
        </CardHeader>
        <CardContent>body</CardContent>
      </Card>,
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(
      screen.queryByText('Choose which sync updates arrive by email.'),
    ).not.toBeInTheDocument();

    await user.hover(
      screen.getByRole('button', { name: /more information/i }),
    );
    expect(
      await screen.findByRole('tooltip', {
        name: 'Choose which sync updates arrive by email.',
      }),
    ).toBeInTheDocument();
  });

  it('finds the title even when it is wrapped alongside a badge', () => {
    render(
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Connections</CardTitle>
          <span>Test</span>
        </div>
        <CardDescription>Connect the source first.</CardDescription>
      </CardHeader>,
    );

    expect(
      screen.getByRole('button', { name: /more information/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Connect the source first.')).toBeNull();
  });

  it('keeps the description visible when inlineDescription is set', () => {
    render(
      <CardHeader inlineDescription>
        <CardTitle>Danger Zone</CardTitle>
        <CardDescription>Manage access to your account.</CardDescription>
      </CardHeader>,
    );

    expect(
      screen.getByText('Manage access to your account.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more information/i }),
    ).toBeNull();
  });

  it('leaves a description with no title alone', () => {
    render(
      <CardHeader>
        <CardDescription>Standalone note.</CardDescription>
      </CardHeader>,
    );

    expect(screen.getByText('Standalone note.')).toBeInTheDocument();
  });

  it('preserves other header children such as CardAction', () => {
    render(
      <CardHeader>
        <CardTitle>Connections</CardTitle>
        <CardDescription>Credential health.</CardDescription>
        <CardAction>
          <button type="button">Switch environment</button>
        </CardAction>
      </CardHeader>,
    );

    expect(
      screen.getByRole('button', { name: 'Switch environment' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /more information/i }),
    ).toBeInTheDocument();
  });
});
