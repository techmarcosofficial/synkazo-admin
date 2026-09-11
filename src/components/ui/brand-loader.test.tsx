import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionLoader, PageLoader } from './brand-loader';

describe('brand loaders', () => {
  it('renders the icon-only action loader with the two source mark paths', () => {
    const { container } = render(<ActionLoader />);

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveClass(
      'animate-spin',
    );
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
