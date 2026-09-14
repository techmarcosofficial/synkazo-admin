import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import OtpInput from './OtpInput';

function OtpHarness() {
  const [value, setValue] = useState('');

  return (
    <>
      <span id="otp-label">Verification code</span>
      <span id="otp-help">Enter the six-digit code.</span>
      <OtpInput
        value={value}
        onChange={setValue}
        labelledBy="otp-label"
        describedBy="otp-help"
      />
      <output>{value}</output>
    </>
  );
}

describe('OtpInput', () => {
  it('labels every digit and supports pasting a complete code', () => {
    render(<OtpHarness />);

    const digits = screen.getAllByRole('textbox');
    expect(digits).toHaveLength(6);
    expect(digits[0]).toHaveAccessibleName(
      'Verification code digit 1 of 6',
    );

    fireEvent.paste(digits[0], {
      clipboardData: { getData: () => '12a3456' },
    });

    expect(screen.getByText('123456', { selector: 'output' })).toBeVisible();
    expect(digits[5]).toHaveFocus();
  });

  it('moves focus with the arrow, Home, and End keys', () => {
    render(<OtpHarness />);

    const digits = screen.getAllByRole('textbox');
    digits[2].focus();
    fireEvent.keyDown(digits[2], { key: 'ArrowLeft' });
    expect(digits[1]).toHaveFocus();

    fireEvent.keyDown(digits[1], { key: 'End' });
    expect(digits[5]).toHaveFocus();

    fireEvent.keyDown(digits[5], { key: 'Home' });
    expect(digits[0]).toHaveFocus();
  });
});
