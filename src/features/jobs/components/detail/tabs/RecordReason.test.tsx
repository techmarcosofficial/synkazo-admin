import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

import { RecordReason } from './RecordReason';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { SyncLogRecord } from '@/types';

afterEach(() => cleanup());

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());

function renderReason(record: SyncLogRecord) {
  return render(
    <TooltipProvider delayDuration={0}>
      <RecordReason
        rec={record}
        context={{
          sourcePlatform: 'service_titan',
          sourceObject: 'customer',
          destPlatform: 'hubspot',
          destObject: 'contact',
        }}
      />
    </TooltipProvider>,
  );
}

describe('RecordReason', () => {
  it('shows a concise conflict summary and opens complete details on keyboard focus', async () => {
    const fullReason =
      "One or more tracked fields conflict with the destination's current value — the whole record was left untouched";

    renderReason({
      id: 'record-1',
      action: 'skipped',
      sourceRecordId: 'source-1001',
      destRecordId: '123456789',
      skipReason: 'record_level_conflict',
      skipReasonDetail: fullReason,
    });

    const trigger = screen.getByRole('button', {
      name: /view skipped reason details/i,
    });
    expect(trigger).toHaveTextContent('Skipped: Tracked field conflict');
    expect(trigger).not.toHaveAttribute('title');

    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(fullReason);
    expect(tooltip).toHaveTextContent('source-1001');
    expect(tooltip).toHaveTextContent('123456789');
    expect(tooltip).toHaveTextContent('Service Titan Customer');
    expect(tooltip).toHaveTextContent('HubSpot Contact');
  });

  it('opens on hover and displays existing contact, mapping, and API details', async () => {
    const user = userEvent.setup();
    renderReason({
      id: 'record-2',
      action: 'failed',
      sourceRecordId: 'source-2002',
      failReason: 'api_error',
      failReasonDetail: 'API validation failed for phone',
      sourceData: JSON.stringify({
        id: 'source-2002',
        email: 'person@example.com',
        contact: { phone: '+1 555 111 2222' },
        emptyValue: null,
      }),
      mappedData: JSON.stringify({
        phone: '+1 555 111 2222',
        ignored: null,
      }),
      destResponse: JSON.stringify({
        category: 'VALIDATION_ERROR',
        message: 'Phone has an invalid format',
        context: undefined,
      }),
    });

    const trigger = screen.getByRole('button', {
      name: /view failed reason details/i,
    });
    expect(trigger).toHaveTextContent('Failed: API validation error');

    await user.hover(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('person@example.com');
    expect(tooltip).toHaveTextContent('+1 555 111 2222');
    expect(tooltip).toHaveTextContent('Mapped field values');
    expect(tooltip).toHaveTextContent('Phone has an invalid format');
    expect(tooltip).not.toHaveTextContent(/null|undefined/i);
  });

  it('displays multiple source records when they are present in the row payload', async () => {
    renderReason({
      id: 'record-duplicates',
      action: 'skipped',
      sourceRecordId: 'source-5001',
      destRecordId: 'hubspot-9001',
      skipReason: 'duplicate',
      skipReasonDetail:
        'Multiple source records target the same HubSpot ID in this batch; review identity mapping',
      sourceData: {
        records: [
          { id: 'source-5001', email: 'first@example.com' },
          { id: 'source-5002', email: 'second@example.com' },
        ],
      },
    });

    fireEvent.focus(
      screen.getByRole('button', { name: /view skipped reason details/i }),
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('source-5001');
    expect(tooltip).toHaveTextContent('source-5002');
    expect(tooltip).toHaveTextContent('first@example.com');
    expect(tooltip).toHaveTextContent('second@example.com');
    expect(tooltip).toHaveTextContent('hubspot-9001');
  });

  it('preserves legacy multiline text and provides wrapping and scrolling styles', async () => {
    const legacyReason = 'First line\nSecond line with a long explanation';
    renderReason({
      id: 'record-3',
      action: 'failed',
      sourceRecordId: 'source-3003',
      failReasonDetail: legacyReason,
    });

    fireEvent.focus(
      screen.getByRole('button', { name: /view failed reason details/i }),
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('First line Second line');
    expect(tooltip).toHaveClass('overflow-y-auto');
    expect(tooltip.querySelector('section p')).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
    );
  });

  it('closes when keyboard focus leaves the trigger', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <div>
          <RecordReason
            rec={{
              id: 'record-4',
              action: 'skipped',
              sourceRecordId: 'source-4004',
              skipReason: 'filter_excluded',
              skipReasonDetail: 'Record matched a configured exclude condition',
            }}
          />
          <button type="button">Next control</button>
        </div>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: /view skipped reason details/i,
    });
    fireEvent.focus(trigger);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(trigger);
    fireEvent.focus(screen.getByRole('button', { name: 'Next control' }));
    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });
});
