import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AssociationConditionsEditor, {
  validateConditions,
} from './AssociationConditionsEditor';

import type { AssociationCondition } from '@/api/associations';

afterEach(() => cleanup());

const FIELDS = [
  { field: 'df_main_contact_id', isArray: false },
  { field: 'df_root_type', isArray: false },
];

describe('validateConditions', () => {
  it('accepts an empty list (no conditions = current behavior)', () => {
    expect(validateConditions([])).toBeNull();
  });

  it('rejects a condition missing a field', () => {
    expect(
      validateConditions([
        { field: '', operator: 'is_not_empty' } as AssociationCondition,
      ]),
    ).toMatch(/field/i);
  });

  it('rejects a value-requiring operator with no value', () => {
    expect(
      validateConditions([{ field: 'x', operator: 'equals', value: '' }]),
    ).toMatch(/comparison value/i);
  });

  it('accepts is_empty/is_not_empty without a value', () => {
    expect(
      validateConditions([{ field: 'x', operator: 'is_not_empty' }]),
    ).toBeNull();
  });
});

describe('AssociationConditionsEditor', () => {
  it('renders an "Add Condition" affordance and no rows when empty', () => {
    render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={[]}
        conditionLogic="AND"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /add condition/i }),
    ).toBeInTheDocument();
  });

  it('adds a new condition row on "Add Condition"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={[]}
        conditionLogic="AND"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /add condition/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [nextConditions] = onChange.mock.calls[0];
    expect(nextConditions).toHaveLength(1);
    expect(nextConditions[0].field).toBe('df_main_contact_id');
  });

  it('removes a condition row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: AssociationCondition[] = [
      { field: 'df_main_contact_id', operator: 'is_not_empty' },
    ];
    render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={conditions}
        conditionLogic="AND"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTitle(/remove condition/i));
    expect(onChange).toHaveBeenCalledWith([], 'AND');
  });

  it('edits the comparison value for a value-requiring operator', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: AssociationCondition[] = [
      { field: 'df_main_contact_id', operator: 'not_equals', value: '' },
    ];
    render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={conditions}
        conditionLogic="AND"
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText('Comparison value');
    await user.type(input, '0');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0][0].value).toBe('0');
  });

  it('shows the AND/OR selector only once there are multiple conditions', () => {
    const { rerender } = render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={[{ field: 'a', operator: 'is_not_empty' }]}
        conditionLogic="AND"
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/combine conditions with/i)).not.toBeInTheDocument();

    rerender(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={[
          { field: 'a', operator: 'is_not_empty' },
          { field: 'b', operator: 'is_not_empty' },
        ]}
        conditionLogic="AND"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/combine conditions with/i)).toBeInTheDocument();
  });

  it('shows a validation error for an incomplete condition', () => {
    render(
      <AssociationConditionsEditor
        fields={FIELDS}
        conditions={[{ field: 'a', operator: 'equals', value: '' }]}
        conditionLogic="AND"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/comparison value/i)).toBeInTheDocument();
  });
});
