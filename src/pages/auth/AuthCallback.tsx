import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { marketplaceApi } from '@/api/marketplace';
import { tokenStorage } from '@/lib/tokenStorage';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get('handoff');
    const redirect = params.get('redirect') || '/dashboard';

    if (!handoff) {
      navigate('/login', { replace: true });
      return;
    }

    // The install redirect carries a single-purpose code, never real tokens —
    // this URL ends up in browser history. Trade it for a session server-side.
    marketplaceApi
      .exchangeHandoff(handoff)
      .then((tokens) => {
        tokenStorage.setTokens(tokens);
        // Force a full page load so the auth context re-initialises from storage
        window.location.replace(redirect);
      })
      .catch(() => navigate('/login', { replace: true }));
  }, []);

  return null;
}
