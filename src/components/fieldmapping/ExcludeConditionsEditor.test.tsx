import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ExcludeConditionsEditor, {
  validateExcludeConditions,
} from './ExcludeConditionsEditor';

import type { ExcludeCondition } from '@/types/conditions';

afterEach(() => cleanup());

const SOURCE_FIELDS = [
  { key: 'status', label: 'Customer status', type: 'text' },
  { key: 'email_address', label: 'Email address', type: 'email' },
];

describe('validateExcludeConditions', () => {
  it('allows an empty condition list', () => {
    expect(validateExcludeConditions([])).toBeNull();
  });

  it('requires a comparison value only for operators that use one', () => {
    expect(
      validateExcludeConditions([
        { field: 'status', operator: 'equals', value: '' },
      ]),
    ).toMatch(/comparison value/i);
    expect(
      validateExcludeConditions([{ field: 'status', operator: 'is_empty' }]),
    ).toBeNull();
  });
});

describe('ExcludeConditionsEditor grid', () => {
  it('shows the empty state without creating a condition', () => {
    render(
      <ExcludeConditionsEditor
        layout="grid"
        sourceFields={SOURCE_FIELDS}
        conditions={[]}
        conditionLogic="AND"
        onChange={vi.fn()}
        showAddButton={false}
      />,
    );

    expect(screen.getByText('No skip conditions')).toBeInTheDocument();
    expect(
      screen.getByText(/every source record is currently eligible/i),
    ).toBeInTheDocument();
  });

  it('keeps the original condition index when removing a filtered row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ExcludeCondition[] = [
      { field: 'status', operator: 'equals', value: 'active' },
      { field: 'email_address', operator: 'contains', value: '@example.com' },
    ];

    render(
      <ExcludeConditionsEditor
        layout="grid"
        sourceFields={SOURCE_FIELDS}
        conditions={conditions}
        conditionLogic="AND"
        onChange={onChange}
        searchQuery="email"
        showAddButton={false}
      />,
    );

    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.queryByText('Customer status')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove condition 2' }),
    );

    expect(onChange).toHaveBeenCalledWith([conditions[0]], 'AND');
  });

  it('keeps preview and the secondary add action in the conditions footer', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPreview = vi.fn();
    const conditions: ExcludeCondition[] = [
      { field: 'status', operator: 'equals', value: 'active' },
    ];

    render(
      <ExcludeConditionsEditor
        layout="grid"
        sourceFields={SOURCE_FIELDS}
        conditions={conditions}
        conditionLogic="AND"
        onChange={onChange}
        onPreview={onPreview}
        showAddButton
      />,
    );

    expect(screen.getByText('1 condition')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /preview matches/i }));
    expect(onPreview).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /add condition/i }));
    expect(onChange).toHaveBeenLastCalledWith(
      [
        conditions[0],
        expect.objectContaining({ field: 'status', operator: 'equals' }),
      ],
      'AND',
    );
  });

  it('opens formatting controls without replacing the condition row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ExcludeCondition[] = [
      { field: 'status', operator: 'equals', value: 'active' },
    ];

    render(
      <ExcludeConditionsEditor
        layout="grid"
        sourceFields={SOURCE_FIELDS}
        conditions={conditions}
        conditionLogic="AND"
        onChange={onChange}
        showAddButton={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /normalize/i }));
    expect(screen.getByText('Normalize before comparing')).toBeInTheDocument();
    expect(screen.getByText('Customer status')).toBeInTheDocument();

    await user.click(
      screen.getByRole('switch', { name: /ignore letter case/i }),
    );
    expect(onChange).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          normalization: expect.objectContaining({ lowercase: true }),
        }),
      ],
      'AND',
    );
  });
});
