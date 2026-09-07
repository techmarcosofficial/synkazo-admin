import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import StickyDetailHeader from './StickyDetailHeader';

afterEach(() => cleanup());

describe('StickyDetailHeader', () => {
  it('layers the header card slightly in front of the compact back action', () => {
    const { container } = render(
      <MemoryRouter>
        <StickyDetailHeader
          backLabel="Back to Projects"
          backTo="/projects"
          header={<div>Project header</div>}
        >
          <div>Project content</div>
        </StickyDetailHeader>
      </MemoryRouter>,
    );

    const backRow = container.querySelector('[data-slot="sticky-detail-back"]');
    const headerRow = container.querySelector(
      '[data-slot="sticky-detail-header"]',
    );
    const backLink = screen.getByRole('link', { name: 'Back to Projects' });

    expect(backLink).toHaveClass(
      'h-(--detail-back-row-height)',
      'rounded-t-3xl',
      'rounded-b-none',
      'pb-(--detail-header-overlap)',
    );
    expect(backLink).toHaveAttribute('data-variant', 'secondary');
    expect(backLink).toHaveTextContent('Back to Projects');
    expect(backRow?.parentElement).toHaveClass(
      '[--detail-back-row-height:--spacing(11)]',
      '[--detail-header-overlap:--spacing(2)]',
    );
    expect(
      backRow?.parentElement?.style.getPropertyValue('--detail-sticky-top'),
    ).toBe('0px');
    expect(backRow).toHaveClass(
      'sticky',
      'top-(--detail-sticky-top)',
      'z-20',
      'bg-background',
      'data-[stuck=true]:before:block',
    );
    expect(headerRow).toHaveClass(
      'sticky',
      'top-[calc(var(--detail-sticky-top)+var(--detail-back-row-height)-var(--detail-header-overlap))]',
      'z-30',
      '-mt-(--detail-header-overlap)',
    );
    expect(headerRow).not.toHaveClass('pb-2', '-mb-2', 'bg-background');
    expect(backRow).not.toBe(headerRow);
    expect(screen.getByText('Project content').closest('section')).toBe(
      backRow?.parentElement,
    );
  });
});
