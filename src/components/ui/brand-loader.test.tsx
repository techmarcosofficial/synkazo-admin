import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionLoader, PageLoader } from './brand-loader';

describe('brand loaders', () => {
  it('draws the icon-only loader from opposite sides without spinning', () => {
    const { container } = render(<ActionLoader />);

    const loader = screen.getByRole('status', { name: 'Loading' });
    expect(loader).toHaveClass('synkazo-action-loader', 'size-4');
    expect(loader).not.toHaveClass('animate-spin');

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    paths.forEach((path) => expect(path).toHaveAttribute('pathLength', '1'));
  });

  it('renders the same icon animation at 56px for page loading', () => {
    const { container } = render(
      <ActionLoader variant="page" aria-label="Loading registration" />,
    );

    const loader = screen.getByRole('status', {
      name: 'Loading registration',
    });
    expect(loader).toHaveClass('synkazo-action-loader', 'size-14');
    expect(loader).not.toHaveClass('size-4', 'animate-spin');
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('renders an accessible page loader with every wordmark path animated', () => {
    const { container } = render(<PageLoader label="Loading dashboard" />);

    expect(
      screen.getByRole('status', { name: 'Loading dashboard' }),
    ).toBeInTheDocument();

    const wordmark = container.querySelector('.synkazo-wordmark-loader');
    expect(wordmark).toBeInTheDocument();
    const paths = wordmark?.querySelectorAll('path') ?? [];
    expect(paths).toHaveLength(9);
    paths.forEach((path) => expect(path).toHaveAttribute('pathLength', '1'));
  });
});
