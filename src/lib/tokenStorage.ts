// Access tokens live only for this page lifetime. Refresh is an HttpOnly cookie.
let accessToken: string | null = null;

interface Tokens {
  accessToken?: string;
}

export const tokenStorage = {
  getToken(key: 'accessToken'): string | null {
    return key === 'accessToken' ? accessToken : null;
  },
  setTokens(tokens: Tokens): void {
    if (tokens.accessToken !== undefined) accessToken = tokens.accessToken;
  },
  updateTokens(tokens: Tokens): void {
    if (tokens.accessToken !== undefined) accessToken = tokens.accessToken;
  },
  clearTokens(): void {
    accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};
