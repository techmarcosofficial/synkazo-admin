import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReadOnlyFieldsPanel from './ReadOnlyFieldsPanel';
import type { FieldDef } from './FieldMappingCanvas';

describe('ReadOnlyFieldsPanel', () => {
  afterEach(cleanup);

  const mockFields: FieldDef[] = [
    { key: 'hs_object_id', label: 'Object ID', type: 'string', readOnly: true },
    { key: 'createdate', label: 'Create Date', type: 'datetime', readOnly: true },
    { key: 'hs_calculated_revenue', label: 'Calculated Revenue', type: 'number', readOnly: true },
  ];

  it('renders platform label, total field count, and 2-column grid items', () => {
    render(
      <ReadOnlyFieldsPanel
        fields={mockFields}
        platformLabel="HubSpot"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Unmapped HubSpot Fields')).toBeInTheDocument();
    expect(screen.getByText('3 fields')).toBeInTheDocument();
    expect(screen.getByText('Object ID')).toBeInTheDocument();
    expect(screen.getByText('hs_object_id')).toBeInTheDocument();
    expect(screen.getByText('Create Date')).toBeInTheDocument();
    expect(screen.getByText('Calculated Revenue')).toBeInTheDocument();
  });

  it('filters unmapped fields based on search input', () => {
    render(
      <ReadOnlyFieldsPanel
        fields={mockFields}
        platformLabel="HubSpot"
        onClose={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search 3 fields/i);
    fireEvent.change(searchInput, { target: { value: 'revenue' } });

    expect(screen.getByText('Calculated Revenue')).toBeInTheDocument();
    expect(screen.queryByText('Object ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Date')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 3/i)).toBeInTheDocument();
  });

  it('shows empty message when no matching fields found', () => {
    render(
      <ReadOnlyFieldsPanel
        fields={mockFields}
        platformLabel="HubSpot"
        onClose={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search 3 fields/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent_property' } });

    expect(screen.getByText(/No unmapped fields matching/i)).toBeInTheDocument();

    // Click clear search
    const clearBtn = screen.getByRole('button', { name: /Clear search filter/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Object ID')).toBeInTheDocument();
  });

  it('calls onClose when hide button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ReadOnlyFieldsPanel
        fields={mockFields}
        platformLabel="HubSpot"
        onClose={handleClose}
      />,
    );

    const hideBtn = screen.getByRole('button', {
      name: /Hide unmapped fields panel/i,
    });
    fireEvent.click(hideBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
