import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import apiClient from '@/api/apiClient';
import AuthStatus from '@/components/auth/AuthStatus';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
    } catch {
      /* Always show success to avoid email enumeration */
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <SplitAuthLayout variant="immersive">
      {sent ? (
        <div>
          <AuthStatus
            icon={CheckCircle2}
            tone="success"
            title="Check your email"
            description={
              <>
                If an account exists for{' '}
                <span className="text-foreground font-medium">{email}</span>,
                you'll receive a password reset link shortly.
              </>
            }
          >
            <Button asChild variant="link" size="sm">
              <Link to="/login">
                <ArrowLeft /> Back to sign in
              </Link>
            </Button>
          </AuthStatus>
        </div>
      ) : (
        <>
          <div className="synkazo-login-heading">
            <p className="synkazo-login-eyebrow">SECURE ACCOUNT RECOVERY.</p>
            <h1>Forgot password?</h1>
            <p>Enter your email and we'll send a reset link.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" required>
                  Email address
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                />
              </Field>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? <Spinner /> : 'Send reset link'}
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-6 text-center">
            <Button asChild variant="link" size="sm">
              <Link to="/login">
                <ArrowLeft /> Back to sign in
              </Link>
            </Button>
          </div>
        </>
      )}
    </SplitAuthLayout>
  );
}
