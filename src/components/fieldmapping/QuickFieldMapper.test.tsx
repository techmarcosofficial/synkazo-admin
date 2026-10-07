import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { FieldDef, MappingRow } from './FieldMappingCanvas';
import QuickFieldMapper from './QuickFieldMapper';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  delete (Element.prototype as { scrollIntoView?: () => void }).scrollIntoView;
  vi.unstubAllGlobals();
});

describe('QuickFieldMapper', () => {
  afterEach(cleanup);

  const mockSourceFields: FieldDef[] = [
    { key: 'first_name', label: 'First Name', type: 'string' },
    { key: 'last_name', label: 'Last Name', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'phone', label: 'Phone Number', type: 'string' },
  ];

  const mockDestFields: FieldDef[] = [
    { key: 'firstname', label: 'First Name', type: 'string' },
    { key: 'lastname', label: 'Last Name', type: 'string' },
    { key: 'email', label: 'Email Address', type: 'string' },
    { key: 'company', label: 'Company', type: 'string', required: true },
    { key: 'id', label: 'Record ID', type: 'string' },
  ];

  const mockMappings: MappingRow[] = [
    {
      sourceField: 'phone',
      destField: 'phone_number',
      destRules: {},
      isMatch: false,
    },
  ];

  it('renders initial single-row quick mapper with header and action buttons', () => {
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={vi.fn()}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    expect(screen.getByText('Quick Map Field')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add mapping row' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('shows delete on single row and adds another row when edge "+" button is clicked', () => {
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={vi.fn()}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Initial state: 1 row with delete button and edge "+" button
    expect(
      screen.getByRole('button', { name: 'Delete row and close' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add mapping row' }),
    ).toBeInTheDocument();

    // Click edge "+" button
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping row' }));

    // Now row 1 has "Delete row 1", row 2 has "Delete row 2"
    expect(
      screen.getByRole('button', { name: 'Delete row 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete row 2' }),
    ).toBeInTheDocument();
  });

  it('removes a row when delete button on that row is clicked', () => {
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={vi.fn()}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Add a second row
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping row' }));
    expect(
      screen.getByRole('button', { name: 'Delete row 2' }),
    ).toBeInTheDocument();

    // Click remove on row 2
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 2' }));

    // Should return to 1 row with "Delete row and close"
    expect(
      screen.getByRole('button', { name: 'Delete row and close' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add mapping row' }),
    ).toBeInTheDocument();
  });

  it('triggers onClose when deleting the only remaining single row', () => {
    const onClose = vi.fn();
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={onClose}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Click delete on the single row
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete row and close' }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Discard button is clicked', () => {
    const onClose = vi.fn();
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={onClose}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-suggests matching destination field when source field is selected', () => {
    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onClose={vi.fn()}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Open source popover
    const sourceBtn = screen.getByRole('combobox', {
      name: /Choose source field/i,
    });
    fireEvent.click(sourceBtn);

    // Select "First Name"
    const option = screen.getByText('First Name');
    fireEvent.click(option);

    // Destination field should automatically suggest "First Name" (firstname key)
    // Both source and destination now display "First Name"
    expect(screen.getAllByText('First Name')).toHaveLength(2);
    // And Apply button should now be enabled
    expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled();
  });

  it('applies batch mappings and calls onMapBatch with all configured pairs', () => {
    const onMapBatch = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mockMappings}
        onMapBatch={onMapBatch}
        onClose={onClose}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Row 1: Pick First Name -> auto-suggests firstname
    const sourceBtn1 = screen.getByRole('combobox', {
      name: /Choose source field/i,
    });
    fireEvent.click(sourceBtn1);
    fireEvent.click(screen.getByText('First Name'));

    // Add row 2
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping row' }));

    // Row 2: Pick Last Name -> auto-suggests lastname
    const comboboxes = screen.getAllByRole('combobox', {
      name: /Choose source field/i,
    });
    fireEvent.click(comboboxes[0]); // newly added row combobox
    fireEvent.click(screen.getByText('Last Name'));

    // Apply button should reflect 2 mappings
    const applyBtn = screen.getByRole('button', { name: 'Apply (2)' });
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);

    expect(onMapBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        source: expect.objectContaining({ key: 'first_name' }),
        dest: expect.objectContaining({ key: 'firstname' }),
      }),
      expect.objectContaining({
        source: expect.objectContaining({ key: 'last_name' }),
        dest: expect.objectContaining({ key: 'lastname' }),
      }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('detects duplicate mapping already present in canvas and prevents applying', () => {
    const mappingsWithEmail: MappingRow[] = [
      ...mockMappings,
      {
        sourceField: 'email',
        destField: 'email',
        destRules: {},
        isMatch: false,
      },
    ];

    render(
      <QuickFieldMapper
        sourceFields={mockSourceFields}
        destFields={mockDestFields}
        mappings={mappingsWithEmail}
        onClose={vi.fn()}
        sourcePlatformLabel="ServiceTitan"
        destPlatformLabel="HubSpot"
      />,
    );

    // Pick Email source -> auto-suggests email destination (which is already mapped)
    const sourceBtn = screen.getByRole('combobox', {
      name: /Choose source field/i,
    });
    fireEvent.click(sourceBtn);
    fireEvent.click(screen.getByText('Email'));

    // Verify canvas duplicate error
    expect(
      screen.getByText('Pair is already mapped in your canvas'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });
});
