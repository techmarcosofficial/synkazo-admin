export interface PasswordCheck {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /\d/.test(p) },
  { label: 'Special char', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordError(password: string): string | null {
  const failed = PASSWORD_CHECKS.filter((c) => !c.test(password));
  if (failed.length === 0) return null;
  return `Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character`;
}
