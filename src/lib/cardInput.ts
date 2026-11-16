/**
 * Client-side card-field helpers for the inline Razorpay form: formatting and basic validation
 * so obviously-bad input is caught before we hand the card to Razorpay. These are convenience
 * checks only — Razorpay is the source of truth for whether a card is actually chargeable.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

/** Rough brand detection from the leading digits, enough to pick an icon and CVV length. */
export function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover';
  return 'unknown';
}

/** Strips everything but digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Formats a card number with spaces for display (4-4-4-4, or 4-6-5 for Amex). */
export function formatCardNumber(value: string): string {
  const digits = digitsOnly(value).slice(0, 19);
  const groups = detectBrand(digits) === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(' ');
}

/** Formats expiry keystrokes into "MM/YY". */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Luhn checksum — rejects typos and random digit strings before they reach Razorpay. */
export function luhnValid(digits: string): boolean {
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Validates "MM/YY" is a real, non-past month. Returns the split parts when valid. */
export function parseExpiry(
  value: string,
): { month: string; year: string } | null {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth))
    return null;
  return { month: match[1], year: match[2] };
}

export function cvvValid(cvv: string, brand: CardBrand): boolean {
  const len = brand === 'amex' ? 4 : 3;
  return new RegExp(`^\\d{${len}}$`).test(cvv);
}

/** Loose E.164-ish check for the contact field (Razorpay requires a phone). */
export function phoneValid(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 8 && digits.length <= 15;
}
