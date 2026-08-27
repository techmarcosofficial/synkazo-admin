type TokenKey = 'accessToken' | 'refreshToken';

const TOKEN_KEYS: TokenKey[] = ['accessToken', 'refreshToken'];

interface Tokens {
  accessToken?: string;
  refreshToken?: string;
}

// Tokens always live in localStorage so every tab of the same browser shares
// one session — sessionStorage is per-tab and previously caused new tabs to
// appear logged out while the original tab kept working.
export const tokenStorage = {
  getToken(key: TokenKey): string | null {
    return localStorage.getItem(key);
  },

  setTokens({ accessToken, refreshToken }: Tokens): void {
    if (accessToken !== undefined)
      localStorage.setItem('accessToken', accessToken);
    if (refreshToken !== undefined)
      localStorage.setItem('refreshToken', refreshToken);
  },

  updateTokens({ accessToken, refreshToken }: Tokens): void {
    if (accessToken !== undefined)
      localStorage.setItem('accessToken', accessToken);
    if (refreshToken !== undefined)
      localStorage.setItem('refreshToken', refreshToken);
  },

  clearTokens(): void {
    for (const key of TOKEN_KEYS) {
      localStorage.removeItem(key);
    }
  },
};
