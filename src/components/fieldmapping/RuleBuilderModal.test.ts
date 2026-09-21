import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Rule } from '@/lib/ruleEngine';

import RuleBuilderModal, {
  buildRulePreviewSteps,
  cloneRules,
  reorderRules,
} from './RuleBuilderModal';

vi.mock('@/api/associations', () => ({
  associationsApi: {
    getSampleRecord: vi.fn().mockResolvedValue(null),
  },
}));

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

afterEach(() => {
  cleanup();
});

describe('buildRulePreviewSteps', () => {
  it('shows the output after each rule in pipeline order', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'prefix', value: 'JOB-', enabled: true },
    ];

    expect(buildRulePreviewSteps('  10482  ', rules)).toEqual([
      {
        index: 0,
        label: 'Trim Spaces',
        output: '10482',
        enabled: true,
      },
      {
        index: 1,
        label: 'Add Prefix',
        output: 'JOB-10482',
        enabled: true,
      },
    ]);
  });

  it('keeps the current value when a rule is disabled', () => {
    const rules: Rule[] = [
      { type: 'uppercase', enabled: false },
      { type: 'suffix', value: '-done', enabled: true },
    ];

    expect(buildRulePreviewSteps('Job', rules)).toEqual([
      {
        index: 0,
        label: 'Uppercase',
        output: 'Job',
        enabled: false,
      },
      {
        index: 1,
        label: 'Add Suffix',
        output: 'Job-done',
        enabled: true,
      },
    ]);
  });
});

describe('reorderRules', () => {
  it('moves a dragged rule to its dropped pipeline position', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: true },
      { type: 'suffix', value: '-done', enabled: true },
    ];

    expect(reorderRules(rules, 2, 0).map((rule) => rule.type)).toEqual([
      'suffix',
      'trim',
      'uppercase',
    ]);
    expect(rules.map((rule) => rule.type)).toEqual([
      'trim',
      'uppercase',
      'suffix',
    ]);
  });

  it('returns the same rule list when the drop does not change position', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: true },
    ];

    expect(reorderRules(rules, 1, 1)).toBe(rules);
  });
});

describe('cloneRules', () => {
  it('keeps drawer edits isolated from the rules supplied by the mapping', () => {
    const initialRules: Rule[] = [
      {
        type: 'value_mapping',
        enabled: true,
        map: { pending: 'Open' },
        normalization: { trim: true },
      },
    ];

    const draft = cloneRules(initialRules);
    draft[0].map!.pending = 'In progress';
    draft[0].normalization!.lowercase = true;

    expect(initialRules).toEqual([
      {
        type: 'value_mapping',
        enabled: true,
        map: { pending: 'Open' },
        normalization: { trim: true },
      },
    ]);
  });
});

describe('RuleBuilderModal guidance', () => {
  const baseProps = {
    mapping: { sourceField: 'name', destField: 'name' },
    destKey: 'name',
    sourceFields: [{ key: 'name', label: 'Name', type: 'string' }],
    destFields: [{ key: 'name', label: 'Name', type: 'string' }],
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  it('shows every rule category collapsed when the drawer opens', () => {
    render(createElement(RuleBuilderModal, baseProps));

    [
      'Text / String',
      'Length Controls',
      'Validation',
      'Conditional',
      'Number Ops',
      'Date Ops',
      'Split / Merge',
      'Type Conversion',
    ].forEach((category) => {
      expect(
        screen.getByRole('button', { name: new RegExp(category) }),
      ).toHaveAttribute('aria-expanded', 'false');
    });
    expect(
      screen.queryByText('Remove leading and trailing whitespace'),
    ).not.toBeInTheDocument();
  });

  it('adds a recommended rule to the pipeline only after the user accepts it', () => {
    const onSave = vi.fn();
    render(
      createElement(RuleBuilderModal, {
        ...baseProps,
        mapping: { sourceField: 'amount', destField: 'amount' },
        destKey: 'amount',
        sourceFields: [{ key: 'amount', label: 'Amount', type: 'string' }],
        destFields: [{ key: 'amount', label: 'Amount', type: 'number' }],
        onSave,
      }),
    );

    expect(
      screen.getByText('Destination expects number; source is string.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No rules added yet')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add suggested rule String → Number',
      }),
    );

    expect(
      screen.queryByRole('button', {
        name: 'Add suggested rule String → Number',
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('No rules added yet')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
