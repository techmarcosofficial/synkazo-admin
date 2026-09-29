import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SkipRecordEditor from './SkipRecordEditor';

afterEach(() => cleanup());

describe('SkipRecordEditor', () => {
  it('presents source and destination rules as labeled groups in one section', () => {
    render(
      <SkipRecordEditor
        layout="grid"
        sourceFields={[
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'customerId', label: 'Customer ID', type: 'text' },
        ]}
        destinationFields={[{ key: 'email', label: 'Email', type: 'email' }]}
        sourceConditions={[{ field: 'email', operator: 'is_empty' }]}
        sourceConditionLogic="OR"
        destinationConditions={[
          {
            sourceField: 'email',
            destinationField: 'email',
            operator: 'different_from_destination',
            direction: 'forward_only',
          },
        ]}
        onSourceChange={vi.fn()}
        onDestinationChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Skip Record' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Source conditions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Destination conditions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/source conditions inspect incoming source data/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/destination conditions run only after an existing/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: 'Destination condition 1 source field',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: 'Destination condition 1 operator',
      }),
    ).toBeInTheDocument();
  });
});

describe('Skip Record actions', () => {
  it('keeps compact empty states and both add actions available', () => {
    const onSourceChange = vi.fn();
    const onDestinationChange = vi.fn();
    render(
      <SkipRecordEditor
        layout="grid"
        sourceFields={[{ key: 'email', label: 'Email', type: 'email' }]}
        destinationFields={[{ key: 'email', label: 'Email', type: 'email' }]}
        sourceConditions={[]}
        sourceConditionLogic="AND"
        destinationConditions={[]}
        onSourceChange={onSourceChange}
        onDestinationChange={onDestinationChange}
        onPreviewSource={vi.fn()}
      />,
    );
    expect(screen.getByText('No skip conditions')).toBeInTheDocument();
    expect(
      screen.getByText('No destination-aware skip conditions.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Preview matches' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add condition' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add destination condition' }),
    );
    expect(onSourceChange).toHaveBeenCalled();
    expect(onDestinationChange).toHaveBeenCalled();
  });
});
