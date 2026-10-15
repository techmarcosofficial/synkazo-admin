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

import QueueJobInlineEditor, {
  queueJobValuesToPayload,
} from './QueueJobInlineEditor';

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

describe('QueueJobInlineEditor', () => {
  it('applies multiple rows to the queue list without a job badge', () => {
    const onApply = vi.fn();
    render(
      <QueueJobInlineEditor
        open
        onClose={vi.fn()}
        jobs={[
          {
            id: 'job-1',
            name: 'Customers',
            sourceObject: 'customers',
            destObject: 'contacts',
          },
          {
            id: 'job-2',
            name: 'Orders',
            sourceObject: 'orders',
            destObject: 'orders',
          },
        ]}
        existingJobIds={[]}
        editing={null}
        onApply={onApply}
        onUpdate={vi.fn()}
        busy={false}
      />,
    );

    fireEvent.click(
      screen.getByRole('combobox', { name: 'Select job in row 1' }),
    );
    fireEvent.click(screen.getByText('Customers'));
    fireEvent.click(screen.getByRole('button', { name: 'Add queue job row' }));
    fireEvent.click(
      screen.getByRole('combobox', { name: 'Select job in row 2' }),
    );
    fireEvent.click(screen.getByText('Orders'));

    expect(screen.queryByText('New')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: /Override priority scheduling/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('spinbutton', { name: /Records per batch/ }),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Apply (2)' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jobId: 'job-1', batchSize: '' }),
        expect.objectContaining({ jobId: 'job-2', batchSize: '' }),
      ]),
    );
  });

  it('keeps the batch input visible and editable without an override control', () => {
    render(
      <QueueJobInlineEditor
        open
        onClose={vi.fn()}
        jobs={[
          {
            id: 'job-1',
            name: 'Customers',
            sourceObject: 'customers',
            destObject: 'contacts',
          },
        ]}
        existingJobIds={[]}
        editing={null}
        onApply={vi.fn()}
        onUpdate={vi.fn()}
        busy={false}
      />,
    );
    const batchInput = screen.getByRole('spinbutton', {
      name: 'Records per batch for row 1',
    });
    expect(batchInput).toBeEnabled();
    expect(
      screen.queryByRole('switch', { name: /Override priority scheduling/ }),
    ).not.toBeInTheDocument();
  });

  it('always sends a batch override and defaults empty input to 100 records', () => {
    expect(
      queueJobValuesToPayload({
        jobId: 'job-1',
        executionWindowMinutes: 30,
        enabled: true,
        baselineMode: null,
        baselineCustomAt: '',
        baselineTimezone: 'UTC',
        batchSize: '',
      }).overrideSyncConfig,
    ).toEqual({ batchSize: 100 });
  });
});
