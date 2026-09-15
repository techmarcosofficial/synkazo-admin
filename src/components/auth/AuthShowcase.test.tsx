import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AuthShowcase from './AuthShowcase';

describe('AuthShowcase', () => {
  it('uses one fixed source card and swaps its content faces in place', () => {
    const { container } = render(<AuthShowcase />);

    expect(
      container.querySelectorAll('.synkazo-sync-source-card'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('.synkazo-sync-source-face'),
    ).toHaveLength(3);
    expect(container.querySelectorAll('.bg-background')).toHaveLength(3);
    expect(container.querySelector('.bg-card')).not.toBeInTheDocument();
    expect(container.querySelector('.shadow-sm')).not.toBeInTheDocument();
    expect(
      container.querySelector('.synkazo-sync-live'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(
        '.synkazo-sync-line-base .synkazo-sync-source-rope',
      ),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(
        '.synkazo-sync-line-flow .synkazo-sync-source-rope',
      ),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('.synkazo-showcase-source-name > strong'),
    ).toHaveLength(3);

    expect(
      container.querySelector('.synkazo-showcase-message-copy'),
    ).toHaveTextContent('Data flowing into HubSpot from');
  });
});
