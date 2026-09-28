import { cleanup, render, screen } from '@testing-library/react';
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
