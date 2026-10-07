import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { marketplaceApi } from '@/api/marketplace';
import { tokenStorage } from '@/lib/tokenStorage';
import { queryClientInstance } from '@/lib/query-client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get('handoff');
    const rawRedirect = params.get('redirect');
    const redirect =
      rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//')
        ? rawRedirect
        : '/dashboard';

    if (!handoff) {
      navigate('/login', { replace: true });
      return;
    }

    // The install redirect carries a single-purpose code, never real tokens —
    // this URL ends up in browser history. Trade it for a session server-side.
    marketplaceApi
      .exchangeHandoff(handoff)
      .then((tokens) => {
        queryClientInstance.clear();
        tokenStorage.clearTokens();
        tokenStorage.setTokens(tokens);
        // Force a full page load so the auth context re-initialises from storage
        const serverRedirect =
          tokens.returnPath?.startsWith('/') &&
          !tokens.returnPath.startsWith('//')
            ? tokens.returnPath
            : redirect;
        window.location.replace(serverRedirect);
      })
      .catch(() => navigate('/login', { replace: true }));
  }, []);

  return null;
}
