import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EditOrganisationMetadataDialog, {
  type EditOrganisationMetadataInitial,
} from './EditOrganisationMetadataDialog';

const initialData: EditOrganisationMetadataInitial = {
  name: 'Acme Services',
  description: 'Original description',
  logoUrl: 'https://example.com/logo.png',
  defaultCurrency: 'USD',
};

function renderDialog(
  overrides: Partial<Parameters<typeof EditOrganisationMetadataDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <EditOrganisationMetadataDialog
      open
      onOpenChange={onOpenChange}
      initial={initialData}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { ...result, onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
});

describe('EditOrganisationMetadataDialog', () => {
  it('populates fields with initial values when opened', () => {
    renderDialog();

    expect(screen.getByLabelText(/^Name/i)).toHaveValue('Acme Services');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Original description');
    expect(screen.getByLabelText(/Logo URL/i)).toHaveValue('https://example.com/logo.png');
    expect(screen.getByLabelText(/Default currency/i)).toHaveValue('USD');
  });

  it('retains user modifications when props change (e.g. isSubmitting: true with new initial ref) without wiping them out', () => {
    const { rerender, onSubmit } = renderDialog();

    const nameInput = screen.getByLabelText(/^Name/i);
    const descInput = screen.getByLabelText(/Description/i);

    // User types new values
    fireEvent.change(nameInput, { target: { value: 'Acme Corporation' } });
    fireEvent.change(descInput, { target: { value: 'Updated description' } });

    expect(nameInput).toHaveValue('Acme Corporation');
    expect(descInput).toHaveValue('Updated description');

    // Simulate parent re-render when mutation triggers isSubmitting: true with a new object reference for initial
    rerender(
      <EditOrganisationMetadataDialog
        open
        onOpenChange={vi.fn()}
        initial={{ ...initialData }}
        isSubmitting={true}
        onSubmit={onSubmit}
      />,
    );

    // Critical assertion: user edits must NOT be wiped out
    expect(screen.getByLabelText(/^Name/i)).toHaveValue('Acme Corporation');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Updated description');
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByLabelText(/^Name/i)).toBeDisabled();
  });

  it('submits only the fields that were modified (delta DTO)', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText(/^Name/i), {
      target: { value: 'Acme Corporation' },
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Corporation',
      });
    });
  });

  it('normalises currency to uppercase and packages into settings DTO', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText(/Default currency/i), {
      target: { value: 'eur' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        settings: { defaultCurrency: 'EUR' },
      });
    });
  });

  it('keeps save button enabled and shows validation errors on click, clearing on change', async () => {
    const { onSubmit } = renderDialog();

    const nameInput = screen.getByLabelText(/^Name/i);
    const currencyInput = screen.getByLabelText(/Default currency/i);
    const saveButton = screen.getByRole('button', { name: /save changes/i });

    // Button is always enabled (active submit pattern)
    expect(saveButton).toBeEnabled();

    // Empty name
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Organisation name is required')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Typing a valid name clears the validation error
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    await waitFor(() => {
      expect(screen.queryByText('Organisation name is required')).not.toBeInTheDocument();
    });

    // Invalid currency (only 2 letters)
    fireEvent.change(currencyInput, { target: { value: 'US' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('Must be a 3-letter currency code (e.g. USD, EUR)'),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Correcting currency clears the error
    fireEvent.change(currencyInput, { target: { value: 'USD' } });
    await waitFor(() => {
      expect(
        screen.queryByText('Must be a 3-letter currency code (e.g. USD, EUR)'),
      ).not.toBeInTheDocument();
    });
  });

  it('re-populates with new initial values when closed and re-opened', () => {
    const { rerender } = renderDialog({ open: false });

    // Open with initialData
    rerender(
      <EditOrganisationMetadataDialog
        open={true}
        onOpenChange={vi.fn()}
        initial={initialData}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^Name/i)).toHaveValue('Acme Services');

    // Close
    rerender(
      <EditOrganisationMetadataDialog
        open={false}
        onOpenChange={vi.fn()}
        initial={initialData}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    // Re-open with updated initialData from server
    const updatedInitial: EditOrganisationMetadataInitial = {
      ...initialData,
      name: 'Globex Corp',
    };

    rerender(
      <EditOrganisationMetadataDialog
        open={true}
        onOpenChange={vi.fn()}
        initial={updatedInitial}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^Name/i)).toHaveValue('Globex Corp');
  });
});
