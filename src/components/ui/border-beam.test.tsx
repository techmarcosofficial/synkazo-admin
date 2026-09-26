import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BorderBeam } from './border-beam';

describe('BorderBeam', () => {
  it('renders SVG with border-beam slot and aria-hidden', () => {
    const { container } = render(<BorderBeam />);
    const beam = container.querySelector('[data-slot="border-beam"]');
    expect(beam).toBeInTheDocument();
    expect(beam).toHaveAttribute('aria-hidden', 'true');
    expect(beam?.tagName.toLowerCase()).toBe('svg');

    const rects = beam?.querySelectorAll('rect');
    expect(rects?.length).toBeGreaterThan(0);
    rects?.forEach((r) => {
      expect(r).toHaveAttribute('fill', 'none');
    });
  });

  it('applies custom duration, border width, and rx to SVG rects', () => {
    const { container } = render(
      <BorderBeam duration={4} borderWidth={3} rx={24} className="custom-test" />,
    );
    const beam = container.querySelector('[data-slot="border-beam"]');
    expect(beam).toHaveClass('custom-test');

    const rects = beam?.querySelectorAll('rect');
    expect(rects?.length).toBe(2);

    rects?.forEach((r) => {
      expect(r).toHaveAttribute('rx', '24');
      expect(r).toHaveStyle({ animation: 'border-beam-dash 4s linear infinite' });
    });
  });

  it('defaults to primary color, 1px border width, and matches container corner radius', () => {
    const { container } = render(
      <div style={{ borderRadius: '28px' }}>
        <BorderBeam />
      </div>,
    );

    const beam = container.querySelector('[data-slot="border-beam"]');
    const rects = beam?.querySelectorAll('rect');
    expect(rects?.length).toBe(2);

    // Main laser core should be 1px and stroke primary
    const core = rects?.[1];
    expect(core).toHaveAttribute('stroke', 'var(--primary)');
    expect(core).toHaveAttribute('stroke-width', '1');
    expect(core).toHaveAttribute('rx', '28');
  });
});
