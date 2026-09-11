import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
}

/** Segmented one-time-code input — dependency-free, keyboard + paste friendly. */
export default function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  labelledBy,
  describedBy,
  invalid,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('');

  const setDigit = (idx: number, digit: string) => {
    const next = value.padEnd(length, ' ').split('');
    next[idx] = digit || ' ';
    onChange(next.join('').replace(/\s/g, '').slice(0, length));
  };

  const handleChange = (idx: number, raw: string) => {
    const numericValue = raw.replace(/\D/g, '');
    if (numericValue.length > 1) {
      const nextValue = numericValue.slice(0, length);
      onChange(nextValue);
      refs.current[Math.min(nextValue.length, length - 1)]?.focus();
      return;
    }

    const digit = numericValue.slice(-1);
    setDigit(idx, digit);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      e.preventDefault();
      setDigit(idx - 1, '');
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
    }
    if (e.key === 'Home') {
      e.preventDefault();
      refs.current[0]?.focus();
    }
    if (e.key === 'End') {
      e.preventDefault();
      refs.current[length - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div
      className="synkazo-otp-inputs"
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Verification code digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          data-filled={digits[i] ? 'true' : undefined}
          className={cn(
            'synkazo-otp-digit',
            'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 shadow-xs',
            'w-full border text-center font-semibold outline-none',
            'transition-[color,box-shadow] focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  );
}
