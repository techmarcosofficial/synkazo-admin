import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StatusBadge from '@/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders the configured label for a known status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('falls back to the raw status string for an unknown status', () => {
    render(<StatusBadge status="unknown-status" />);
    expect(screen.getByText('unknown-status')).toBeInTheDocument();
  });
});
