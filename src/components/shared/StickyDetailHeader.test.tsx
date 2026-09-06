import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import StickyDetailHeader from './StickyDetailHeader';

afterEach(() => cleanup());

describe('StickyDetailHeader', () => {
  it('keeps the compact back action and header in separate sticky rows', () => {
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

    expect(backLink).toHaveClass('h-9', 'rounded-t-3xl', 'rounded-b-none');
    expect(backLink).toHaveTextContent('Back to Projects');
    expect(backRow?.parentElement).toHaveClass(
      '[--detail-back-row-height:--spacing(9)]',
    );
    expect(
      backRow?.parentElement?.style.getPropertyValue('--detail-sticky-top'),
    ).toBe('0px');
    expect(backRow).toHaveClass(
      'sticky',
      'top-(--detail-sticky-top)',
      'z-30',
      'bg-background',
      'data-[stuck=true]:before:block',
    );
    expect(headerRow).toHaveClass(
      'sticky',
      'top-[calc(var(--detail-sticky-top)+var(--detail-back-row-height))]',
      'z-20',
      'bg-background',
    );
    expect(headerRow).not.toHaveClass('pb-2', '-mb-2');
    expect(backRow).not.toBe(headerRow);
    expect(screen.getByText('Project content').closest('section')).toBe(
      backRow?.parentElement,
    );
  });
});
