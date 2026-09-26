import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StatusBadge from '@/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders the configured label for a known status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders configured labels for job onboarding statuses', () => {
    const { rerender } = render(<StatusBadge status="needs_mapping" />);
    expect(screen.getByText('Needs Mapping')).toBeInTheDocument();

    rerender(<StatusBadge status="ready_to_test" />);
    expect(screen.getByText('Ready to Test')).toBeInTheDocument();
  });

  it('falls back to the raw status string for an unknown status', () => {
    render(<StatusBadge status="unknown-status" />);
    expect(screen.getByText('unknown-status')).toBeInTheDocument();
  });

  it('renders custom label and title when provided', () => {
    render(
      <StatusBadge
        status="sandbox"
        label="Sandbox (Test Mode)"
        title="Operating in Sandbox — Live customer data is not affected"
      />,
    );
    const badge = screen.getByText('Sandbox (Test Mode)');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'title',
      'Operating in Sandbox — Live customer data is not affected',
    );
  });
});
