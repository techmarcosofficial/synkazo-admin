import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PageContextAlert from './PageContextAlert';

import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

afterEach(() => {
  cleanup();
  useAlertDismissStore.setState({ dismissed: {} });
});

describe('PageContextAlert', () => {
  it.each([
    ['info', 'bg-info/10'],
    ['warning', 'bg-warning/10'],
    ['error', 'bg-destructive/10'],
    ['success', 'bg-success/10'],
  ] as const)(
    'renders %s as a borderless semantic surface without another card',
    (variant, backgroundClass) => {
      render(<PageContextAlert variant={variant} title="Page condition" />);

      const notice = screen.getByText('Page condition').closest('[role]');
      expect(notice).toHaveClass(backgroundClass, 'border-0');
      expect(notice?.closest('[data-slot="card"]')).toBeNull();
    },
  );

  it('keeps an error visible even when dismissible is requested', () => {
    render(
      <PageContextAlert
        variant="error"
        title="Page unavailable"
        dismissible
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Dismiss alert' }),
    ).not.toBeInTheDocument();
  });

  it('keeps a warning dismissed for the current session', () => {
    const { unmount } = render(
      <PageContextAlert
        variant="warning"
        dismissKey="warning:action-required"
        title="Action required"
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    unmount();
    render(
      <PageContextAlert
        variant="warning"
        dismissKey="warning:action-required"
        title="Action required"
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['info', 'success'] as const)(
    'allows a session-dismissible %s notice',
    (variant) => {
      const onDismiss = vi.fn();
      render(
        <PageContextAlert
          variant={variant}
          title="Helpful context"
          dismissible
          onDismiss={onDismiss}
        />,
      );

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledOnce();
    },
  );
});
