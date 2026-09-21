import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { FieldSelect, type FieldDef } from './FieldMappingCanvas';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  delete (Element.prototype as { scrollIntoView?: () => void }).scrollIntoView;
  vi.unstubAllGlobals();
});
afterEach(cleanup);

describe('FieldSelect', () => {
  it('keeps modal field options scrollable and contained', async () => {
    const user = userEvent.setup();
    const fields: FieldDef[] = Array.from({ length: 30 }, (_, index) => ({
      key: `field_${index + 1}`,
      label: `Field ${index + 1}`,
      type: index === 29 ? 'extraordinarily_long_remote_field_type' : 'string',
    }));

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Field mapping</DialogTitle>
          <FieldSelect
            fields={fields}
            value=""
            onChange={vi.fn()}
            placeholder="Choose a field"
          />
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('combobox'));

    const popover = document.querySelector<HTMLElement>(
      '[data-slot="popover-content"]',
    );
    expect(popover).toBeInTheDocument();

    const scrollArea = popover?.querySelector('[data-slot="scroll-area"]');
    expect(scrollArea).toBeInTheDocument();
    expect(scrollArea).toHaveClass('h-64');
    const viewport = scrollArea?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveClass(
      '[&>div]:!block',
      '[&>div]:!w-full',
      '[&>div]:!min-w-0',
    );

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });
    viewport?.dispatchEvent(wheelEvent);
    await waitFor(() => expect((viewport as HTMLElement).scrollTop).toBe(120));

    expect(screen.getByText('Field 30')).toBeInTheDocument();
    expect(
      screen.getByTitle('extraordinarily_long_remote_field_type'),
    ).toHaveClass('max-w-20', 'shrink-0', 'truncate');
  });
});
