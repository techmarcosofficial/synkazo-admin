import { describe, expect, it } from 'vitest';

import { getPasswordError } from '@/lib/passwordValidation';

describe('getPasswordError', () => {
  it('returns null when all password rules are met', () => {
    expect(getPasswordError('Abcdefg1!')).toBeNull();
  });

  it('returns an error message when password rules are not met', () => {
    expect(getPasswordError('abc')).toEqual(expect.any(String));
  });
});
