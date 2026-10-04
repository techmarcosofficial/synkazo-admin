import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RuleLibraryPopover from './RuleLibraryPopover';

describe('RuleLibraryPopover', () => {
  afterEach(cleanup);

  it('renders search input and category chips', () => {
    render(
      <RuleLibraryPopover
        currentRules={[]}
        onAddRule={vi.fn()}
      />,
    );

    expect(screen.getByText(/Add Transformation Rule/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search regex, replace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Text / String' })).toBeInTheDocument();
  });

  it('filters rules by search text', () => {
    render(
      <RuleLibraryPopover
        currentRules={[]}
        onAddRule={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search regex, replace/i);
    fireEvent.change(searchInput, { target: { value: 'regex' } });

    expect(screen.getByText('Regex Replace')).toBeInTheDocument();
    expect(screen.queryByText('Capitalize Words')).not.toBeInTheDocument();
  });

  it('calls onAddRule when Add button is clicked', () => {
    const handleAddRule = vi.fn();
    render(
      <RuleLibraryPopover
        currentRules={[]}
        onAddRule={handleAddRule}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search regex, replace/i);
    fireEvent.change(searchInput, { target: { value: 'regex' } });

    const addBtns = screen.getAllByRole('button', { name: /Add/i });
    fireEvent.click(addBtns[0]);

    expect(handleAddRule).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'regex_replace' }),
    );
  });

  it('displays guidance banner to Section 3 when searching for empty value policies', () => {
    render(
      <RuleLibraryPopover
        currentRules={[]}
        onAddRule={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search regex, replace/i);
    fireEvent.change(searchInput, { target: { value: 'empty' } });

    expect(screen.getByText(/Looking for empty value handling/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 3: Empty Value Policy & Fallback/i)).toBeInTheDocument();
  });
});
