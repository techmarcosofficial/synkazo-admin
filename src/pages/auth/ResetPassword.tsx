import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import apiClient from '@/api/apiClient';
import AuthStatus from '@/components/auth/AuthStatus';
import BrandMark from '@/components/auth/BrandMark';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token: resetToken,
        password: form.newPassword,
      });
      setDone(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e?.response?.data?.message ||
          'Failed to reset password. The link may have expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitAuthLayout>
      <BrandMark />

      {!resetToken ? (
        <div className="mt-9">
          <AuthStatus
            icon={AlertTriangle}
            tone="danger"
            title="Invalid reset link"
            description="This link is missing or invalid. Please request a new one."
          >
            <Button asChild>
              <Link to="/forgot-password">Request new link</Link>
            </Button>
          </AuthStatus>
        </div>
      ) : done ? (
        <div className="mt-9">
          <AuthStatus
            icon={CheckCircle2}
            tone="success"
            title="Password reset!"
            description="Your password has been updated successfully."
          >
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </AuthStatus>
        </div>
      ) : (
        <>
          <div className="mt-9 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              Set new password
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter and confirm your new password.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newPassword" required>
                  New Password
                </FieldLabel>
                <PasswordInput
                  id="newPassword"
                  value={form.newPassword}
                  onChange={(e) =>
                    setForm({ ...form, newPassword: e.target.value })
                  }
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  autoFocus
                />
                <PasswordStrength password={form.newPassword} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword" required>
                  Confirm Password
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Spinner /> : 'Reset password'}
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </SplitAuthLayout>
  );
}
