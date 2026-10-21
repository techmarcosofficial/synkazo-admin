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

  it('keeps the drawer open and highlights a missing Replace Text input', () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={onOpenChange}
        mapping={{ ...mockMapping, destRules: { Phone: [{ type: 'replace', find: '', replacement: 'new' }] } }}
        destKey="Phone"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save all settings/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText(/Fill the highlighted required fields/)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Required')[0]).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getAllByPlaceholderText('Required')[0], { target: { value: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: /save all settings/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      rules: [{ type: 'replace', find: 'old', replacement: 'new' }],
    }));
  });

  it('requires Map Values fallback and source, but accepts an empty destination', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={vi.fn()}
        mapping={{ ...mockMapping, destRules: { Phone: [{ type: 'value_map', map: { '': '' }, fallback: '' }] } }}
        destKey="Phone"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save all settings/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Source value')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByPlaceholderText('Required')).toHaveAttribute('aria-invalid', 'true');

    rerender(
      <FieldSettingsDrawer
        open={true}
        onOpenChange={vi.fn()}
        mapping={{ ...mockMapping, destRules: { Phone: [{ type: 'value_map', map: { pending: '' }, fallback: 'other' }] } }}
        destKey="Phone"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save all settings/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      rules: [{ type: 'value_map', map: { pending: '' }, fallback: 'other' }],
    }));
  });
});
