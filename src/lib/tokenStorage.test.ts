import { beforeEach, describe, expect, it } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStorage.clearTokens();
  });

  it('keeps access tokens in memory and clears legacy persisted tokens', () => {
    tokenStorage.setTokens({ accessToken: 'access' });
    expect(tokenStorage.getToken('accessToken')).toBe('access');
    expect(localStorage.getItem('accessToken')).toBeNull();
    localStorage.setItem('refreshToken', 'legacy');
    tokenStorage.clearTokens();
    expect(tokenStorage.getToken('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
