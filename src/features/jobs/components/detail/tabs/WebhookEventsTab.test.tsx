import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WebhookEventsTab from './WebhookEventsTab';

import type { WebhookEvent, WebhookValueChangesResult } from '@/types';

let changesResult: {
  data?: WebhookValueChangesResult;
  isLoading: boolean;
  isError: boolean;
};
const changesQuery = vi.fn();

const event = {
  id: 'evt-1',
  projectId: 'project-1',
  eventType: 'company.creation',
  objectType: 'companies',
  objectId: '359845316306',
  propertyName: 'st_payment_term_id',
  status: 'suppressed_echo',
  receivedAt: '2026-11-04T08:51:27.000Z',
  processedAt: '2026-11-04T08:52:30.000Z',
  stObjectType: 'customers',
  stRecordId: null,
  payload: null,
  mappedPayload: null,
  destResponse: null,
  errorMessage: 'Changed by Synkazo — not written back',
  failReason: null,
  attempts: 1,
  nextAttemptAt: null,
  coalescedIntoEventId: null,
  propertyChanges: [
    {
      property: 'address',
      oldValue: null,
      newValue: null,
      sourceType: 'INTEGRATION',
      sourceId: '111',
      changedAt: '2026-11-04T08:51:09.000Z',
      isOwnWrite: true,
    },
  ],
  relatedEvents: [
    {
      id: 'evt-0',
      eventType: 'company.propertyChange',
      propertyName: 'address',
      receivedAt: '2026-11-04T08:51:24.000Z',
    },
  ],
} as unknown as WebhookEvent;

vi.mock('../context', () => ({
  useJobDetailContext: () => ({ projectId: 'project-1', job: { id: 'job-1' } }),
}));

vi.mock('@/queries/useConnections', () => ({
  useProjectConnectionsQuery: () => ({
    data: [{ id: 'conn-1', platformId: 'hubspot' }],
    isLoading: false,
  }),
  useWebhookEventsQuery: () => ({
    data: { data: [event], total: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useWebhookEventChangesQuery: (...args: unknown[]) => {
    changesQuery(...args);
    return changesResult;
  },
}));

afterEach(cleanup);
beforeEach(() => {
  changesQuery.mockClear();
  changesResult = {
    isLoading: false,
    isError: false,
    data: {
      changes: [
        {
          property: 'address',
          label: 'Street Address',
          oldValue: null,
          newValue: '200 POWELL PL',
          changedAt: '2026-11-04T08:51:09.000Z',
          sourceType: 'INTEGRATION',
          sourceId: '111',
          isOwnWrite: true,
        },
        {
          property: 'balance',
          label: 'Balance',
          oldValue: null,
          newValue: '0',
          changedAt: '2026-11-04T08:51:09.000Z',
          sourceType: 'INTEGRATION',
          sourceId: '111',
          isOwnWrite: true,
        },
        {
          property: 'do_not_mail',
          label: 'Do Not Mail',
          oldValue: 'true',
          newValue: 'false',
          changedAt: '2026-11-04T08:51:09.000Z',
          sourceType: 'INTEGRATION',
          sourceId: '111',
          isOwnWrite: true,
        },
      ],
    },
  };
});

function openEvent() {
  render(<WebhookEventsTab />);
  fireEvent.click(screen.getByText('company.creation'));
}

describe('WebhookEventsTab', () => {
  it('fetches values only once an event is opened', () => {
    render(<WebhookEventsTab />);
    expect(changesQuery).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('company.creation'));
    expect(changesQuery).toHaveBeenCalledWith(
      'project-1',
      'conn-1',
      'evt-1',
      true,
    );
  });

  it('shows property, previous value and new value with Empty, 0 and false', () => {
    openEvent();

    expect(
      screen.getByRole('columnheader', { name: 'Previous value' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'New value' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Changed by' }),
    ).not.toBeInTheDocument();

    const address = screen.getByText('Street Address').closest('tr')!;
    expect(address).toHaveTextContent('Empty');
    expect(address).toHaveTextContent('200 POWELL PL');
    expect(screen.getByText('Balance').closest('tr')).toHaveTextContent(
      /^Balance\s*Empty\s*0$/,
    );
    expect(screen.getByText('Do Not Mail').closest('tr')).toHaveTextContent(
      'truefalse',
    );
    expect(screen.getByText(/^Changed by Synkazo · /)).toBeInTheDocument();
  });

  it('no longer shows the sibling event list or raw payload blocks', () => {
    openEvent();
    expect(
      screen.queryByText(/Other events HubSpot sent/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Raw HubSpot notification'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Payload sent')).not.toBeInTheDocument();
    // The burst's last property is not shown as if it were the only one
    expect(screen.queryByText('st_payment_term_id')).not.toBeInTheDocument();
    expect(screen.getByText(/2 events for this change/)).toBeInTheDocument();
  });

  it('explains when values cannot be shown', () => {
    changesResult = {
      isLoading: false,
      isError: false,
      data: {
        changes: [],
        unavailableReason: 'Values could not be loaded from HubSpot right now',
      },
    };
    openEvent();
    expect(
      screen.getByText('Values could not be loaded from HubSpot right now'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so when nothing actually changed', () => {
    changesResult = {
      isLoading: false,
      isError: false,
      data: { changes: [] },
    };
    openEvent();
    expect(screen.getByText('No property values changed.')).toBeInTheDocument();
  });
});
