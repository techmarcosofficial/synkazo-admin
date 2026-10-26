import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CatalogEntryDialog } from './MarketplaceCatalogCard';

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

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderDialog(
  overrides: Partial<Parameters<typeof CatalogEntryDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <CatalogEntryDialog
      open
      onOpenChange={onOpenChange}
      existing={null}
      isSubmitting={false}
      errorMessage={null}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { ...result, onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
});

const VALID_REASON = 'adding new hubspot v2 integration connector';

describe('CatalogEntryDialog', () => {
  it('keeps submit button enabled by default and shows validation errors on empty submit', async () => {
    const { onSubmit } = renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create entry/i });

    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Slug is required')).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears validation error when the operator types into an invalid field', async () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create entry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Slug is required')).toBeInTheDocument();
    });

    const slugInput = screen.getByLabelText(/^Slug/i);
    fireEvent.change(slugInput, { target: { value: 'hubspot' } });

    await waitFor(() => {
      expect(screen.queryByText('Slug is required')).not.toBeInTheDocument();
    });
  });

  it('validates slug format and displays error for invalid characters', async () => {
    renderDialog();
    const slugInput = screen.getByLabelText(/^Slug/i);
    const submitBtn = screen.getByRole('button', { name: /create entry/i });

    fireEvent.change(slugInput, { target: { value: 'INVALID_SLUG_SPACES' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Slug must contain only lowercase letters, digits, and hyphens',
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(slugInput, { target: { value: 'hubspot-crm' } });

    await waitFor(() => {
      expect(
        screen.queryByText(
          'Slug must contain only lowercase letters, digits, and hyphens',
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('submits form with valid values', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText(/^Slug/i), {
      target: { value: 'hubspot' },
    });
    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'HubSpot CRM' },
    });
    fireEvent.change(screen.getByLabelText(/Short description/i), {
      target: { value: 'Sync contacts and deals with HubSpot' },
    });
    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: VALID_REASON },
    });

    fireEvent.click(screen.getByRole('button', { name: /create entry/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        slug: 'hubspot',
        displayName: 'HubSpot CRM',
        shortDescription: 'Sync contacts and deals with HubSpot',
        visible: true,
        sortOrder: 100,
        reason: VALID_REASON,
      });
    });
  });

  it('disables submit button and shows Saving... when isSubmitting is true', () => {
    renderDialog({ isSubmitting: true });
    const submitBtn = screen.getByRole('button', { name: /saving…/i });
    expect(submitBtn).toBeDisabled();
  });
});
