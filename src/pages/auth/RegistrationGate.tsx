import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authPagesSettingsApi } from '@/api/auth-pages-settings';
import { Spinner } from '@/components/ui/spinner';
import Register from './Register';

/**
 * RegistrationGate — checks if registration is enabled before rendering the Register page.
 * If registration is disabled, redirects to login.
 * If registration is enabled or settings fail to load, renders the register page.
 */
export default function RegistrationGate() {
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    authPagesSettingsApi
      .get()
      .then((settings) => {
        if (isMounted) {
          setRegistrationEnabled(settings.register);
        }
      })
      .catch((err) => {
        // On error, default to allowing registration (don't block on settings fetch)
        if (isMounted) {
          console.error('Failed to fetch auth pages settings:', err);
          setRegistrationEnabled(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Show spinner while loading settings
  if (registrationEnabled === null) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  // If registration is disabled, redirect to login
  if (registrationEnabled === false) {
    return <Navigate to="/login" replace />;
  }

  // Registration is enabled or failed to load settings (defaults to true), show register page
  return <Register />;
}
