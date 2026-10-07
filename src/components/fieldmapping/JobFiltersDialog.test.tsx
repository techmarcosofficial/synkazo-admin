import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FieldDef } from './FieldMappingCanvas';
import JobFiltersDialog from './JobFiltersDialog';

describe('JobFiltersDialog', () => {
  afterEach(cleanup);

  const mockSourceFields: FieldDef[] = [
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
  ];

  const mockDestinationFields: FieldDef[] = [
    { key: 'lead_id', label: 'Lead ID', type: 'string' },
    { key: 'customer_email', label: 'Customer Email', type: 'string' },
  ];

  it('renders title, segmented switcher, and done button without card-in-card nesting', () => {
    render(
      <JobFiltersDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestinationFields}
        sourceConditions={[]}
        sourceConditionLogic="AND"
        destinationConditions={[]}
        onSourceChange={vi.fn()}
        onDestinationChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Job-Level Record Filters')).toBeInTheDocument();
    expect(screen.getByText('All Filters (0)')).toBeInTheDocument();
    expect(screen.getByText('Source Filters')).toBeInTheDocument();
    expect(screen.getByText('Destination Guards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('allows switching between tabs (All, Source Filters, Destination Guards)', () => {
    render(
      <JobFiltersDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestinationFields}
        sourceConditions={[
          { field: 'status', operator: 'equals', value: 'inactive' },
        ]}
        sourceConditionLogic="AND"
        destinationConditions={[
          {
            sourceField: 'email',
            operator: 'different_from_destination',
            destinationField: 'customer_email',
          },
        ]}
        onSourceChange={vi.fn()}
        onDestinationChange={vi.fn()}
      />,
    );

    // Initial state: Both are visible under 'All Filters'
    expect(screen.getByText('Source conditions')).toBeInTheDocument();
    expect(screen.getByText('Destination conditions')).toBeInTheDocument();

    // Click 'Source Filters'
    fireEvent.click(screen.getByRole('button', { name: /Source Filters/i }));
    expect(screen.getByText('Source conditions')).toBeInTheDocument();
    expect(
      screen.queryByText('Destination conditions'),
    ).not.toBeInTheDocument();

    // Click 'Destination Guards'
    fireEvent.click(
      screen.getByRole('button', { name: /Destination Guards/i }),
    );
    expect(screen.queryByText('Source conditions')).not.toBeInTheDocument();
    expect(screen.getByText('Destination conditions')).toBeInTheDocument();
  });

  it('displays validation error and disables Done button when error is passed', () => {
    const onOpenChange = vi.fn();
    render(
      <JobFiltersDialog
        open={true}
        onOpenChange={onOpenChange}
        sourceFields={mockSourceFields}
        destinationFields={mockDestinationFields}
        sourceConditions={[{ field: '', operator: 'equals', value: 'test' }]}
        sourceConditionLogic="AND"
        destinationConditions={[]}
        onSourceChange={vi.fn()}
        onDestinationChange={vi.fn()}
        error="Source skip condition 1 is missing a field."
      />,
    );

    expect(
      screen.getByText('Source skip condition 1 is missing a field.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Incomplete Rule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  });

  it('displays inline error indicator directly on invalid condition row', () => {
    render(
      <JobFiltersDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceFields={mockSourceFields}
        destinationFields={mockDestinationFields}
        sourceConditions={[{ field: '', operator: 'equals', value: '' }]}
        sourceConditionLogic="AND"
        destinationConditions={[]}
        onSourceChange={vi.fn()}
        onDestinationChange={vi.fn()}
      />,
    );

    // Inline field validation indicator should appear
    expect(screen.getByText('Please select a field')).toBeInTheDocument();
    // Inline comparison value validation indicator should appear for 'equals'
    expect(screen.getByText('Comparison value required')).toBeInTheDocument();
  });
});
