import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CombineFieldsDialog from './CombineFieldsDialog';
import type { FieldDef } from './FieldMappingCanvas';

describe('CombineFieldsDialog', () => {
  afterEach(cleanup);

  const mockSourceFields: FieldDef[] = [
    { key: 'first_name', label: 'First Name', type: 'string' },
    { key: 'last_name', label: 'Last Name', type: 'string' },
    { key: 'middle_name', label: 'Middle Name', type: 'string' },
    { key: 'suffix', label: 'Suffix', type: 'string' },
  ];

  const mockDestFields: FieldDef[] = [
    { key: 'full_name', label: 'Full Name', type: 'string' },
    { key: 'display_name', label: 'Display Name', type: 'string' },
  ];

  it('renders header, destination select, and draggable source field pipeline', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('Combine Multiple Fields')).toBeInTheDocument();
    expect(screen.getByText('Target Destination Field:')).toBeInTheDocument();
    expect(screen.getByText('Source Fields in Sequence:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Source Field/i })).toBeInTheDocument();
  });

  it('does NOT contain useless text option or Add text button', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    expect(screen.queryByText('Add text')).not.toBeInTheDocument();
    expect(screen.queryByText('Static text')).not.toBeInTheDocument();
  });

  it('renders separator preset options', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Space' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comma + Space' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });

  it('allows adding a new source field to the pipeline', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /Add Source Field/i });
    fireEvent.click(addBtn);

    // Initial has 2 fields; clicking add adds a 3rd field slot
    expect(screen.getByTestId('combine-field-item-2')).toBeInTheDocument();
    expect(screen.getAllByText('#3').length).toBeGreaterThan(0);
  });

  it('renders live combined preview panel with test sandbox', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('Live Combined Preview')).toBeInTheDocument();
    expect(screen.getByText(/Combination Chain/i)).toBeInTheDocument();
    expect(screen.getByText(/Fill sample data/i)).toBeInTheDocument();
  });

  it('calls onApply with destination and combine config when valid and submitted', () => {
    const handleApply = vi.fn();
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        initial={{
          destinationField: 'full_name',
          config: {
            type: 'combine',
            separator: 'space',
            components: [
              { type: 'field', value: 'first_name' },
              { type: 'field', value: 'last_name' },
            ],
          },
        }}
        onApply={handleApply}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Save combined mapping/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    expect(handleApply).toHaveBeenCalledWith(
      'full_name',
      expect.objectContaining({
        type: 'combine',
        separator: 'space',
        components: [
          { type: 'field', value: 'first_name' },
          { type: 'field', value: 'last_name' },
        ],
      }),
    );
  });

  it('does NOT contain arrow-based reordering buttons', () => {
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        onApply={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/Move field.*up/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Move field.*down/i)).not.toBeInTheDocument();
  });

  it('reorders source fields using drag and drop', () => {
    const handleApply = vi.fn();
    render(
      <CombineFieldsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestFields}
        initial={{
          destinationField: 'full_name',
          config: {
            type: 'combine',
            separator: 'space',
            components: [
              { type: 'field', value: 'first_name' },
              { type: 'field', value: 'last_name' },
            ],
          },
        }}
        onApply={handleApply}
      />,
    );

    const item0 = screen.getByTestId('combine-field-item-0');
    const item1 = screen.getByTestId('combine-field-item-1');

    // Simulate drag start on item 0 and drop on item 1
    fireEvent.dragStart(item0, {
      dataTransfer: {
        setData: vi.fn(),
        getData: () => '0',
        effectAllowed: 'move',
      },
    });
    fireEvent.dragOver(item1, {
      dataTransfer: { dropEffect: 'move' },
    });
    fireEvent.drop(item1, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? '0' : ''),
      },
    });
    fireEvent.dragEnd(item0);

    // After drop, save combined mapping and verify components are reordered
    const submitBtn = screen.getByRole('button', { name: /Save combined mapping/i });
    fireEvent.click(submitBtn);

    expect(handleApply).toHaveBeenCalledWith(
      'full_name',
      expect.objectContaining({
        components: [
          { type: 'field', value: 'last_name' },
          { type: 'field', value: 'first_name' },
        ],
      }),
    );
  });
});

