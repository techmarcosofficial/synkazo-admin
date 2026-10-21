import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import AssociationQueueComposer from './AssociationQueueComposer';

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

afterEach(cleanup);
afterAll(() => {
  delete (Element.prototype as { scrollIntoView?: () => void }).scrollIntoView;
  vi.unstubAllGlobals();
});

describe('AssociationQueueComposer', () => {
  it('applies multiple inline association rule rows together', () => {
    const onApply = vi.fn();
    render(
      <AssociationQueueComposer
        open
        onClose={vi.fn()}
        options={[
          {
            id: 'rule-1',
            name: 'Company owners',
            sourceObject: 'companies',
            targetObject: 'owners',
          },
          {
            id: 'rule-2',
            name: 'Contact accounts',
            sourceObject: 'contacts',
            targetObject: 'accounts',
          },
        ]}
        existingRuleIds={[]}
        onApply={onApply}
      />,
    );

    fireEvent.click(
      screen.getByRole('combobox', {
        name: 'Choose association rule in row 1',
      }),
    );
    fireEvent.click(screen.getByText('Company owners'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add association rule row' }),
    );
    fireEvent.click(
      screen.getByRole('combobox', {
        name: 'Choose association rule in row 2',
      }),
    );
    fireEvent.click(screen.getByText('Contact accounts'));
    expect(screen.getAllByText('New')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Apply (2)' }));
    expect(onApply).toHaveBeenCalledWith([
      { associationRuleId: 'rule-1', enabled: true },
      { associationRuleId: 'rule-2', enabled: true },
    ]);
  });
});
