import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { FeatureFlagDialog } from './FeatureFlagsCard';

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
  overrides: Partial<Parameters<typeof FeatureFlagDialog>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <FeatureFlagDialog
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

const VALID_REASON = 'enabling flag for beta testing cluster';

describe('FeatureFlagDialog', () => {
  it('keeps submit button enabled by default and shows validation errors on empty submit', async () => {
    const { onSubmit } = renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create flag/i });

    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Key is required')).toBeInTheDocument();
      expect(
        screen.getByText('Audit reason must be at least 10 characters'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears validation error when the operator types into an invalid field', async () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /create flag/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Key is required')).toBeInTheDocument();
    });

    const keyInput = screen.getByLabelText(/^Key/i);
    fireEvent.change(keyInput, { target: { value: 'new_billing_flow' } });

    await waitFor(() => {
      expect(screen.queryByText('Key is required')).not.toBeInTheDocument();
    });
  });

  it('validates key format and displays error for invalid characters', async () => {
    renderDialog();
    const keyInput = screen.getByLabelText(/^Key/i);
    const submitBtn = screen.getByRole('button', { name: /create flag/i });

    fireEvent.change(keyInput, { target: { value: 'INVALID KEY WITH SPACES' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Key must contain only lowercase letters, digits, and . - _',
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(keyInput, { target: { value: 'valid-key_v2' } });

    await waitFor(() => {
      expect(
        screen.queryByText(
          'Key must contain only lowercase letters, digits, and . - _',
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('submits form with valid values', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText(/^Key/i), {
      target: { value: 'custom_feature_1' },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'My description' },
    });
    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: VALID_REASON },
    });

    fireEvent.click(screen.getByRole('button', { name: /create flag/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        key: 'custom_feature_1',
        enabled: false,
        description: 'My description',
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
