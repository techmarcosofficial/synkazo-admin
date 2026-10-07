import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FieldSettingsDrawer from './FieldSettingsDrawer';
import type { MappingRow } from './FieldMappingCanvas';

describe('FieldSettingsDrawer', () => {
  afterEach(cleanup);

  const mockMapping: MappingRow = {
    sourceField: 'phone_number',
    destField: 'Phone',
    destRules: {
      Phone: [{ type: 'trim', enabled: true }],
    },
    destDefaults: {
      Phone: '555-0100',
    },
    destOnEmpty: {
      Phone: 'default',
    },
    destUpdatePolicy: {
      Phone: 'always',
    },
  };

  it('renders fixed header with field labels and badges', () => {
    render(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={vi.fn()}
        mapping={mockMapping}
        destKey="Phone"
        sourceFieldDef={{ key: 'phone_number', label: 'Customer Phone', type: 'string' }}
        destFieldDef={{ key: 'Phone', label: 'Primary Phone', type: 'string' }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Customer Phone').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Primary Phone').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Field Settings & Pipeline/i)).toBeInTheDocument();
  });

  it('renders all 3 unified workbench sections', () => {
    render(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={vi.fn()}
        mapping={mockMapping}
        destKey="Phone"
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/1\. Record Matching & Overwrite Policy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2\. Data Cleaning & Transformation Pipeline/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3\. Empty Value Policy & Fallback/i),
    ).toBeInTheDocument();
  });

  it('saves configured settings on clicking save button', () => {
    const handleSave = vi.fn();
    render(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={vi.fn()}
        mapping={mockMapping}
        destKey="Phone"
        onSave={handleSave}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /save all settings/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKey: 'phone_number',
        destKey: 'Phone',
        defaultValue: '555-0100',
        onEmpty: 'default',
        updatePolicy: 'always',
        isMatch: false,
      }),
    );
  });
});
