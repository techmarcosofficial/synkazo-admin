import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { authApi } from '@/api/auth';
import AuthStatus from '@/components/auth/AuthStatus';
import BrandMark from '@/components/auth/BrandMark';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type Status = 'pending' | 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const pending = searchParams.get('pending') === 'true';
  const email = searchParams.get('email') || '';

  const [status, setStatus] = useState<Status>(
    pending ? 'pending' : token ? 'verifying' : 'error',
  );
  const [resendEmail, setResendEmail] = useState(email);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification(resendEmail);
    } catch {
      /* backend always returns success to avoid enumeration */
    } finally {
      setResendSent(true);
      setResendLoading(false);
    }
  };

  const signInLink = (
    <p className="text-muted-foreground mt-6 text-center text-xs">
      Already verified?{' '}
      <Link to="/login" className="text-primary hover:underline">
        Sign in
      </Link>
    </p>
  );

  return (
    <SplitAuthLayout>
      <BrandMark />

      {status === 'pending' && (
        <div className="mt-9">
          <AuthStatus
            icon={Mail}
            tone="primary"
            title="Check your inbox"
            description={
              <>
                We sent a verification link to
                {email && (
                  <span className="text-foreground mt-1 block font-medium">
                    {email}
                  </span>
                )}
                <span className="mt-2 block text-xs">
                  The link expires in 24 hours. Check your spam folder if you
                  don't see it.
                </span>
              </>
            }
          >
            {resendSent ? (
              <p className="text-success flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="size-4" /> New link sent — check your
                inbox.
              </p>
            ) : (
              <Button
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </Button>
            )}
          </AuthStatus>
          {signInLink}
        </div>
      )}

      {status === 'verifying' && (
        <div className="mt-9 flex flex-col items-center gap-4 py-4 text-center">
          <Spinner className="size-8" />
          <p className="text-muted-foreground text-sm">Verifying your email…</p>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-9">
          <AuthStatus
            icon={CheckCircle2}
            tone="success"
            title="Email verified!"
            description="Your account is now active. You can sign in and get started."
          >
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </AuthStatus>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-9">
          <AuthStatus
            icon={AlertTriangle}
            tone="danger"
            title="Link invalid or expired"
            description="Verification links expire after 24 hours. Enter your email to get a new one."
          >
            {resendSent ? (
              <p className="text-success flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="size-4" /> New link sent — check your
                inbox.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResend();
                }}
                className="w-full"
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="resend-email" required>
                      Email address
                    </FieldLabel>
                    <Input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Button
                    type="submit"
                    disabled={resendLoading || !resendEmail}
                    className="w-full"
                  >
                    {resendLoading ? 'Sending…' : 'Send new verification link'}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </AuthStatus>
          {signInLink}
        </div>
      )}
    </SplitAuthLayout>
  );
}
