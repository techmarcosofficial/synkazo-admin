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

import { MemoryRouter } from 'react-router-dom';

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
    <MemoryRouter>
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
      </TooltipProvider>
    </MemoryRouter>,
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

  it('opens on hover and displays only IDs and API details', async () => {
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
    expect(tooltip).toHaveTextContent('source-2002');
    expect(tooltip).not.toHaveTextContent('person@example.com');
    expect(tooltip).not.toHaveTextContent('+1 555 111 2222');
    expect(tooltip).not.toHaveTextContent('Mapped field values');
    expect(tooltip).toHaveTextContent('Phone has an invalid format');
    expect(tooltip).not.toHaveTextContent(/null|undefined/i);
  });

  it('does not expose source payload values in the tooltip', async () => {
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
    expect(tooltip).not.toHaveTextContent('source-5002');
    expect(tooltip).not.toHaveTextContent('first@example.com');
    expect(tooltip).not.toHaveTextContent('second@example.com');
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
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <div>
            <RecordReason
              rec={{
                id: 'record-4',
                action: 'skipped',
                sourceRecordId: 'source-4004',
                skipReason: 'filter_excluded',
                skipReasonDetail:
                  'Record matched a configured exclude condition',
              }}
            />
            <button type="button">Next control</button>
          </div>
        </TooltipProvider>
      </MemoryRouter>,
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
  it('shows the matched source condition and actual value for a skipped record', async () => {
    renderReason({
      id: 'record-source-condition',
      action: 'skipped',
      sourceRecordId: 'contact-1',
      skipReason: 'filter_excluded',
      skipReasonDetail:
        'Source skip conditions matched (logic=OR; matched 1 of 2): email is empty (actual=<empty>)',
    });

    const trigger = screen.getByRole('button', {
      name: /view skipped reason details/i,
    });
    expect(trigger).toHaveTextContent('Skipped: Matched a skip rule');
    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Match Any');
    expect(tooltip).toHaveTextContent('email is empty');
    expect(tooltip).toHaveTextContent('actual=<empty>');
  });

  it('shows source, mapped, and destination values for a destination skip', async () => {
    renderReason({
      id: 'record-destination-condition',
      action: 'skipped',
      sourceRecordId: 'contact-2',
      destRecordId: 'hubspot-2',
      skipReason: 'destination_condition',
      skipReasonDetail:
        'Destination skip conditions matched (logic=ANY; matched 1): email → email is different from destination (source=Incoming@Example.com; mapped=incoming@example.com; destination=current@example.com)',
    });

    const trigger = screen.getByRole('button', {
      name: /view skipped reason details/i,
    });
    expect(trigger).toHaveTextContent(
      'Skipped: Matched a destination skip rule',
    );
    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('source=Incoming@Example.com');
    expect(tooltip).toHaveTextContent('mapped=incoming@example.com');
    expect(tooltip).toHaveTextContent('destination=current@example.com');
    expect(tooltip).not.toHaveTextContent('Failed');
  });

  it('renders dynamic 1-click recovery actions with deep link params for missing required field', async () => {
    render(
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <RecordReason
            projectId="proj-test-1"
            jobId="job-test-2"
            rec={{
              id: 'record-missing-field',
              action: 'failed',
              sourceRecordId: 'order-101',
              failReason: 'missing_required_field',
              failReasonDetail: 'Missing required property: dealname',
            }}
            context={{
              destPlatform: 'hubspot',
              destObject: 'deal',
            }}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', {
      name: /view failed reason details/i,
    });
    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Suggested Action');
    expect(tooltip).toHaveTextContent(/Default fallback value \("dealname"\)/i);
    expect(tooltip).toHaveTextContent(/Skip rule suggestion \("dealname"\)/i);
    expect(tooltip).toHaveTextContent('HubSpot requires "dealname"');
  });
});
