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

  it('displays reassurance notice when existing mappings exist', () => {
    render(
      <AutoMapReviewDialog
        preview={{
          ...preview,
          existingCount: 5,
        }}
        destFields={[{ key: 'email_address', label: 'Email Address' }]}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(
      screen.getByText((content) =>
        content.includes('will remain completely untouched'),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Safe & Non-destructive/i)).toBeInTheDocument();
  });

  it('supports Accept All for multiple suggestions', () => {
    const multiPreview: AutoMapPreview = {
      matched: [
        {
          source: { key: 'first_name', label: 'First Name' },
          dest: { key: 'firstname', label: 'First Name' },
          score: 95,
          reason: 'Exact match',
        },
      ],
      review: [
        {
          source: { key: 'email', label: 'Email' },
          dest: { key: 'email_address', label: 'Email Address' },
          score: 82,
          reason: 'Known alias',
        },
        {
          source: { key: 'phone', label: 'Phone' },
          dest: { key: 'phone_number', label: 'Phone Number' },
          score: 80,
          reason: 'Token overlap',
        },
      ],
      unmatched: [{ key: 'notes', label: 'Notes', type: 'string' }],
      existingCount: 2,
    };

    render(
      <AutoMapReviewDialog
        preview={multiPreview}
        destFields={[
          { key: 'email_address', label: 'Email Address' },
          { key: 'phone_number', label: 'Phone Number' },
          { key: 'firstname', label: 'First Name' },
        ]}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    // Initial ready count: 1 matched + 0 accepted = 1
    expect(
      screen.getByRole('button', { name: 'Apply 1 Mapping' }),
    ).toBeEnabled();

    // Click Accept all (2)
    const acceptAllBtn = screen.getByRole('button', {
      name: /accept all \(2\)/i,
    });
    fireEvent.click(acceptAllBtn);

    // Now all 2 suggestions are accepted => 1 matched + 2 accepted = 3 mappings
    expect(
      screen.getByRole('button', { name: 'Apply 3 Mappings' }),
    ).toBeEnabled();

    // Reset all appears
    const resetAllBtn = screen.getByRole('button', { name: /reset all/i });
    expect(resetAllBtn).toBeInTheDocument();
    fireEvent.click(resetAllBtn);

    // Reverted back to 1 mapping
    expect(
      screen.getByRole('button', { name: 'Apply 1 Mapping' }),
    ).toBeEnabled();
  });
});
