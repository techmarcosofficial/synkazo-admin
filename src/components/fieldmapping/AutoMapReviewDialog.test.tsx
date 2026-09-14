import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AutoMapReviewDialog, {
  type AutoMapPreview,
} from './AutoMapReviewDialog';

afterEach(cleanup);

describe('AutoMapReviewDialog', () => {
  const preview: AutoMapPreview = {
    matched: [],
    review: [
      {
        source: { key: 'email', label: 'Email' },
        dest: { key: 'email_address', label: 'Email Address' },
        score: 82,
        reason: 'Known alias',
      },
    ],
    unmatched: [],
    existingCount: 0,
  };

  it('keeps Accept and Undo in the same action position and restores pending state', () => {
    render(
      <AutoMapReviewDialog
        preview={preview}
        destFields={[
          { key: 'email_address', label: 'Email Address' },
          { key: 'alternate_email', label: 'Alternate Email' },
        ]}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const accept = screen.getByRole('button', { name: 'Accept' });
    expect(accept).toHaveClass('w-16');

    fireEvent.click(accept);

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toHaveClass('w-16');
    expect(screen.getByRole('status')).toHaveTextContent('Accepted');
    expect(
      screen.getByRole('button', { name: 'Apply 1 Mapping' }),
    ).toBeEnabled();

    fireEvent.click(undo);

    expect(screen.getByRole('button', { name: 'Accept' })).toHaveClass('w-16');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Apply 0 Mappings' }),
    ).toBeDisabled();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });
});
