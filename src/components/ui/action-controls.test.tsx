import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from './button';
import { Switch } from './switch';

afterEach(() => cleanup());

describe('compact action controls', () => {
  it('keeps icon button variants square and centered', () => {
    render(
      <Button size="icon-sm" aria-label="Settings">
        <svg aria-hidden="true" />
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveClass(
      'size-8',
      'aspect-square',
      'p-0',
      'rounded-3xl',
      'items-center',
      'justify-center',
    );
  });

  it('uses a circular thumb for the compact semantic switch', () => {
    const { container } = render(
      <Switch size="sm" aria-label="Enable rule" />,
    );

    expect(screen.getByRole('switch', { name: 'Enable rule' })).toHaveClass(
      'h-4',
      'w-7',
      'rounded-full',
    );
    expect(container.querySelector('[data-slot="switch-thumb"]')).toHaveClass(
      'group-data-[size=sm]/switch:size-3',
      'rounded-full',
    );
  });
});
