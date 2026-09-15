import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from './authValidation';

const validRegistration = {
  fullName: 'Jane Smith',
  email: 'jane@example.com',
  orgName: 'Acme',
  password: 'Secure1!',
  confirmPassword: 'Secure1!',
};

describe('auth validation', () => {
  it('requires valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '',
      remember: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Enter a valid email address.',
      );
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password is required.',
      );
    }
  });

  it('normalizes surrounding whitespace in submitted auth fields', () => {
    const result = registerSchema.parse({
      ...validRegistration,
      fullName: '  Jane Smith  ',
      email: '  jane@example.com  ',
      orgName: '  Acme  ',
    });

    expect(result.fullName).toBe('Jane Smith');
    expect(result.email).toBe('jane@example.com');
    expect(result.orgName).toBe('Acme');
  });

  it('enforces the registration password requirements', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: 'weak',
      confirmPassword: 'weak',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(
        /uppercase letter/i,
      );
    }
  });

  it('places password mismatch feedback on the confirmation field', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: 'Different1!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwords do not match.',
      );
    }
  });

  it('requires a valid forgot-password email address', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'invalid' }).success).toBe(
      false,
    );
    expect(
      forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success,
    ).toBe(true);
  });
});
