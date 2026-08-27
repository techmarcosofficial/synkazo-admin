import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { invitationsApi } from '@/api/invitations';
import AuthStatus from '@/components/auth/AuthStatus';
import BrandMark from '@/components/auth/BrandMark';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getPasswordError } from '@/lib/passwordValidation';
import { roleLabel } from '@/lib/permissions';
import { type UserRole } from '@/types';

interface AcceptResult {
  organisationName?: string;
  role?: string;
}

type Status = 'form' | 'submitting' | 'success' | 'error';

export default function AcceptInvite() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [status, setStatus] = useState<Status>(token ? 'form' : 'error');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [data, setData] = useState<AcceptResult | null>(null);
  const [errorMsg, setErrorMsg] = useState(
    token ? '' : 'No invitation token found.',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setErrorMsg(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    setStatus('submitting');
    try {
      const result = await invitationsApi.acceptInvitation({
        token: token ?? '',
        fullName: fullName.trim(),
        password,
      });
      setData(result);
      setStatus('success');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        e.response?.data?.message ??
          'This invitation is invalid or has expired.',
      );
      setStatus('error');
    }
  };

  return (
    <SplitAuthLayout>
      <BrandMark />

      {(status === 'form' || status === 'submitting') && (
        <>
          <div className="mt-9 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              Accept Invitation
            </h1>
            <p className="text-muted-foreground text-sm">
              Set up your account to join your organisation.
            </p>
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite-name" required>
                  Full Name
                </FieldLabel>
                <Input
                  id="invite-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-password" required>
                  Password
                </FieldLabel>
                <PasswordInput
                  id="invite-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <PasswordStrength password={password} />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-confirm" required>
                  Confirm Password
                </FieldLabel>
                <PasswordInput
                  id="invite-confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </Field>
              <Button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full"
              >
                {status === 'submitting' ? <Spinner /> : 'Create Account'}
              </Button>
            </FieldGroup>
          </form>
        </>
      )}

      {status === 'success' && (
        <div className="mt-9">
          <AuthStatus
            icon={CheckCircle}
            tone="success"
            title="Account Created!"
            description={
              <>
                You've joined{' '}
                <strong className="text-foreground">
                  {data?.organisationName || 'the organisation'}
                </strong>{' '}
                as{' '}
                <strong className="text-primary">
                  {roleLabel(data?.role as UserRole)}
                </strong>
                .
              </>
            }
          >
            <Button asChild>
              <Link to="/login">
                Go to Login <ArrowRight />
              </Link>
            </Button>
          </AuthStatus>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-9">
          <AuthStatus
            icon={AlertCircle}
            tone="danger"
            title="Invitation Failed"
            description={
              errorMsg || 'This invitation is invalid or has expired.'
            }
          >
            <Button asChild variant="outline">
              <Link to="/login">Back to Login</Link>
            </Button>
          </AuthStatus>
        </div>
      )}
    </SplitAuthLayout>
  );
}
